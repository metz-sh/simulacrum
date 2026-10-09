#!/usr/bin/env node
import { fork } from 'node:child_process';
import { mkdir, writeFile, readFile, unlink, rmdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { bounded, delay, integer, readManifest, request, secret, stopChild } from './core.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = path.join(root, '.simulacrum-dev');
const lockDirectory = path.join(directory, 'lock');
const manifestFile = path.join(directory, 'session.json');
const help = {
	usage: 'node tools/devkit/cli.mjs <command> [options]',
	commands: {
		start: 'Start an owned session; --headed opens a visible window; --timeout <ms> (default 90000, range 1000..180000)',
		status: 'Read lifecycle status and historical readiness (use snapshot for a fresh observation)',
		stop: 'Stop the authenticated session and wait for owned resource cleanup',
		logs: 'Read log ring; --after <cursor> (default 0), --limit <1..500> (default 100)',
		snapshot: 'Read fixture bridge JSON state (no arbitrary evaluation)',
		screenshot: 'Capture viewport PNG in the session artifact directory',
		dom: 'Read the shared page accessibility tree',
		click: 'Click an exact --role and --name, optionally scoped by --story title',
		fill: 'Fill --role and --name with --value or --value-file; optional --story title',
		press: 'Press --value keys on exact --role and --name; optional --story title',
		select: 'Select option label --value on exact --role and --name; optional --story title',
		wait: 'Wait for --stage editor|story; optional --story title and --timeout ms',
		build: 'Click the real Build button and await its versioned result; optional --timeout ms',
		story: 'Use --story title --action step|play|pause|reset; optional --timeout ms',
	},
	output: 'One JSON value on stdout; errors have ok:false and exit code 1. --help is JSON.',
};

function parse(args) {
	if (!args.length || args.includes('--help') || args[0] === 'help') return { command: 'help' };
	const [command, ...rest] = args;
	if (!Object.hasOwn(help.commands, command)) throw new Error(`Unknown command: ${command}`);
	const allowed =
		{
			start: ['timeout'],
			logs: ['after', 'limit'],
			click: ['role', 'name', 'story', 'timeout'],
			fill: ['role', 'name', 'value', 'value-file', 'story', 'timeout'],
			press: ['role', 'name', 'value', 'story', 'timeout'],
			select: ['role', 'name', 'value', 'story', 'timeout'],
			wait: ['stage', 'story', 'timeout'],
			build: ['timeout'],
			story: ['story', 'action', 'timeout'],
		}[command] ?? [];
	const options = {};
	for (let index = 0; index < rest.length; index += 1) {
		const key = rest[index].startsWith('--') ? rest[index].slice(2) : '';
		if (command === 'start' && key === 'headed') {
			if (Object.hasOwn(options, key)) throw new Error('Duplicate option: --headed');
			options.headed = true;

			continue;
		}
		if (
			!allowed.includes(key) ||
			rest[index + 1] === undefined ||
			Object.hasOwn(options, key)
		) {
			throw new Error(`Invalid or duplicate option: ${rest[index]}`);
		}
		options[key] = rest[index + 1];
		index += 1;
	}
	return { command, options };
}

async function start(options) {
	const timeout = integer(options.timeout ?? 90000, 'timeout', 1000, 180000);
	const session = secret();
	const token = secret();
	await mkdir(directory, { recursive: true, mode: 0o700 });
	try {
		await mkdir(lockDirectory, { mode: 0o700 });
	} catch (error) {
		if (error.code !== 'EEXIST') throw error;
		throw new Error(
			'A session or stale lock exists. Use status/stop; see README for manual stale-lock recovery. No process was signalled.'
		);
	}
	let child;
	let listening;
	let succeeded = false;
	try {
		await writeFile(path.join(lockDirectory, 'owner'), session, { flag: 'wx', mode: 0o600 });
		child = fork(fileURLToPath(new URL('./daemon.mjs', import.meta.url)), [], {
			cwd: root,
			detached: true,
			stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
			execArgv: [],
		});
		const ready = new Promise((resolve, reject) => {
			child.on('message', (message) => {
				if (message.type === 'listening') listening = message.manifest;
				if (message.type === 'ready') resolve(message.status);
				if (message.type === 'failed') {
					const error = new Error(message.error);
					error.logs = message.logs;
					reject(error);
				}
			});
			child.once('error', reject);
			child.once('exit', (code, signal) =>
				reject(new Error(`Daemon exited during startup (${code ?? signal})`))
			);
		});
		child.send({ session, token, timeout, headed: options.headed ?? false });
		await bounded(ready, timeout, 'Startup timed out waiting for compiler-ready fixture');
		if (!listening) throw new Error('Daemon did not announce its authenticated endpoint');
		const verified = await request(listening, '/status', { timeout: 2000 });
		if (verified.phase !== 'running') throw new Error(`Session is ${verified.phase}`);
		succeeded = true;
		child.unref();
		return verified;
	} catch (error) {
		if (listening && !error.logs) {
			try {
				error.logs = await request(listening, '/logs?limit=500', { timeout: 1000 });
			} catch {}
		}
		throw error;
	} finally {
		if (!succeeded) {
			// Only the handle created above is signalled; no PID is loaded from disk.
			await stopChild(child, 7500, false);
			try {
				// Once announced, the daemon alone confirms resource cleanup and releases its lock.
				if (
					!listening &&
					(await readFile(path.join(lockDirectory, 'owner'), 'utf8')) === session
				) {
					try {
						if ((await readManifest(manifestFile)).session === session)
							await unlink(manifestFile);
					} catch (error) {
						if (error.code !== 'ENOENT') throw error;
					}
					await unlink(path.join(lockDirectory, 'owner'));
					await rmdir(lockDirectory);
				}
			} catch (error) {
				if (error.code !== 'ENOENT') throw error;
			}
		}
	}
}

async function main() {
	const { command, options } = parse(process.argv.slice(2));
	if (command === 'help') return help;
	if (command === 'start') return start(options);
	let manifest;
	try {
		manifest = await readManifest(manifestFile);
	} catch (error) {
		if (error.code === 'ENOENT' && ['status', 'stop'].includes(command)) {
			let locked = false;
			try {
				await stat(lockDirectory);
				locked = true;
			} catch (error) {
				if (error.code !== 'ENOENT') throw error;
			}
			return {
				phase: locked ? 'locked' : 'stopped',
				message: locked
					? 'Startup in progress or stale lock; no process was signalled.'
					: undefined,
			};
		}
		throw error;
	}
	if (command === 'stop') {
		await request(manifest, '/status', { timeout: 2000 });
		const result = await request(manifest, '/stop', { method: 'POST', timeout: 2000 });
		const deadline = Date.now() + 9000;
		while (true) {
			try {
				const owner = await readFile(path.join(lockDirectory, 'owner'), 'utf8');
				if (owner !== manifest.session) break;
			} catch (error) {
				if (error.code === 'ENOENT') break;
				throw error;
			}
			if (Date.now() >= deadline)
				throw new Error(
					'Stop acknowledged, but cleanup was not confirmed; no fallback PID kill attempted'
				);
			await delay(100);
		}
		return { ...result, phase: 'stopped' };
	}
	if (['dom', 'click', 'fill', 'press', 'select', 'wait', 'build', 'story'].includes(command)) {
		const input = { command, ...options };
		if (input.timeout !== undefined)
			input.timeout = integer(input.timeout, 'timeout', 1, 30000);
		if (input['value-file'] !== undefined) {
			if (input.value !== undefined) throw new Error('Use either --value or --value-file');
			const file = input['value-file'];
			if ((await stat(file)).size > 16000) throw new Error('Value file exceeds 16000 bytes');
			input.value = await readFile(file, 'utf8');
			delete input['value-file'];
		}
		return request(manifest, '/action', {
			method: 'POST',
			body: input,
			timeout: (input.timeout ?? 8000) + 5000,
		});
	}
	let route = `/${command}`;
	if (command === 'logs') {
		const after = integer(options.after ?? 0, 'after', 0, Number.MAX_SAFE_INTEGER);
		const limit = integer(options.limit ?? 100, 'limit', 1, 500);
		route += `?after=${after}&limit=${limit}`;
	}
	try {
		if (command === 'screenshot') await request(manifest, '/status', { timeout: 2000 });
		return await request(manifest, route, {
			method: command === 'screenshot' ? 'POST' : 'GET',
		});
	} catch (error) {
		if (command === 'status')
			throw new Error(
				`Session status unavailable: ${error.message}. Manifest may be stale; no process was signalled.`
			);
		throw error;
	}
}

try {
	console.log(JSON.stringify({ ok: true, ...(await main()) }));
} catch (error) {
	console.log(
		JSON.stringify({
			ok: false,
			error: error.message,
			code: error.code,
			details: error.details,
			logs: error.logs,
		})
	);
	process.exitCode = 1;
}
