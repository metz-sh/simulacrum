import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { spawn, execFile } from 'node:child_process';
import { once } from 'node:events';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, copyFile, writeFile, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	PROTOCOL,
	MAX_RESPONSE,
	LogRing,
	authenticated,
	integer,
	request,
	secret,
	stopChild,
	bounded,
	storybookExecutable,
	browserChannel,
} from './core.mjs';

const execute = promisify(execFile);
const here = fileURLToPath(new URL('.', import.meta.url));

test('log ring bounds memory, truncates text, and exposes cursor gaps', () => {
	const ring = new LogRing(2, 4);
	ring.push('test', 'first');
	ring.push('test', 'second');
	ring.push('test', 'third');
	const page = ring.read(0, 1);
	assert.equal(page.truncated, true);
	assert.equal(page.nextCursor, 2);
	assert.equal(page.entries[0].text, 'seco');
	assert.equal(ring.read(page.nextCursor).entries[0].cursor, 3);
	assert.equal(ring.read(3).nextCursor, 3);
	assert.throws(() => ring.read(-1));
	assert.throws(() => ring.read(0, 501));
});

test('browser channel defaults to pinned Chromium and Chrome is explicit', () => {
	assert.equal(browserChannel(), 'chromium');
	assert.equal(browserChannel('chromium'), 'chromium');
	assert.equal(browserChannel('chrome'), 'chrome');
	for (const invalid of ['', 'firefox', '/some/executable']) {
		assert.throws(() => browserChannel(invalid), /chromium or chrome/);
	}
});

test('strict options and constant-time credential comparison', () => {
	assert.equal(integer('12', 'port', 1, 99), 12);
	for (const invalid of ['1x', '-1', '1.2', 'Infinity', '', '100']) {
		assert.throws(() => integer(invalid, 'port', 1, 99));
	}
	assert.equal(authenticated('abc', 'abc'), true);
	assert.equal(authenticated('abc', 'abd'), false);
	assert.equal(authenticated(undefined, 'abc'), false);
	assert.equal(authenticated('é', 'a'), false);
});

test('HTTP client verifies endpoint identity and bounds time and size', async (t) => {
	const session = secret();
	const token = secret();
	const server = http.createServer((req, res) => {
		assert.equal(req.headers.authorization, `Bearer ${token}`);
		assert.equal(req.headers['x-devkit-session'], session);
		if (req.url === '/hang') return;
		res.setHeader('x-devkit-protocol', PROTOCOL);
		res.setHeader('x-devkit-session', req.url === '/wrong' ? secret() : session);
		if (req.url === '/large') return res.end('x'.repeat(MAX_RESPONSE + 1));
		res.end(JSON.stringify({ phase: 'ready' }));
	});
	await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
	t.after(() => {
		server.closeAllConnections();
		server.close();
	});
	const manifest = { protocol: PROTOCOL, session, token, port: server.address().port };
	assert.equal((await request(manifest, '/status')).phase, 'ready');
	await assert.rejects(request(manifest, '/wrong'), /identity/);
	await assert.rejects(request(manifest, '/large'), /size limit/);
	await assert.rejects(request(manifest, '/hang', { timeout: 50 }), /timed out/);
});

test('owned child stop escalates and does not signal an exited handle', async () => {
	const child = spawn(
		process.execPath,
		[
			'-e',
			"process.on('SIGTERM', () => {}); console.log('ready'); setInterval(() => {}, 1000)",
		],
		{
			detached: process.platform !== 'win32',
			stdio: ['ignore', 'pipe', 'ignore'],
		}
	);
	await bounded(once(child.stdout, 'data'), 3000);
	await stopChild(child, 50);
	assert.notEqual(child.signalCode, null);
	await stopChild(child, 50);
});

async function fixture(t, ready = true) {
	// Isolated fake packages test orchestration, not real Playwright or Storybook behavior.
	const root = await mkdtemp(path.join(here, '.test-'));
	await mkdir(path.join(root, 'tools/devkit'), { recursive: true });
	for (const file of ['cli.mjs', 'daemon.mjs', 'core.mjs', 'actions.mjs']) {
		await copyFile(path.join(here, file), path.join(root, 'tools/devkit', file));
	}
	await writeFile(path.join(root, 'package.json'), '{"type":"module"}');
	const cli = path.join(root, 'tools/devkit/cli.mjs');
	const run = async (...args) => {
		try {
			const { stdout } = await execute(process.execPath, [cli, ...args], { timeout: 15000 });
			return JSON.parse(stdout);
		} catch (error) {
			if (error.stdout) return JSON.parse(error.stdout);
			throw error;
		}
	};
	t.after(async () => {
		await run('stop');
		await rm(root, { recursive: true, force: true });
	});
	for (const name of ['storybook', 'playwright'])
		await mkdir(path.join(root, 'node_modules', name), { recursive: true });
	await writeFile(
		path.join(root, 'node_modules/storybook/package.json'),
		JSON.stringify({
			name: 'storybook',
			type: 'module',
			bin: { storybook: './actual-bin.mjs' },
		})
	);
	await writeFile(
		path.join(root, 'node_modules/storybook/actual-bin.mjs'),
		`
		import http from 'node:http';
		import { writeFileSync } from 'node:fs';
		if (process.env.SIMULACRUM_DEVKIT !== '1') process.exit(2);
		const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
		const server = http.createServer((req, res) => res.end('fixture'));
		server.listen(port, '127.0.0.1', () => console.log('mock Storybook ready'));
		process.on('SIGTERM', () => { writeFileSync('storybook-stopped', 'yes'); process.exit(); });
	`
	);
	await writeFile(
		path.join(root, 'node_modules/playwright/package.json'),
		JSON.stringify({ name: 'playwright', type: 'module', exports: './index.mjs' })
	);
	await writeFile(
		path.join(root, 'bridge-state.json'),
		JSON.stringify({ compilerReady: ready, generation: 'fixture-1', data: [1, 2] })
	);
	await writeFile(
		path.join(root, 'node_modules/playwright/index.mjs'),
		`
		import { writeFile, readFile } from 'node:fs/promises';
		export const chromium = { launch: async (options) => (await writeFile('browser-options.json', JSON.stringify(options)), {
			on() {}, close: async () => {}, newPage: async () => ({
				on() {}, goto: async (url) => { const response = await fetch(url); await response.text(); return { ok: () => response.ok }; },
				evaluate: async () => {
									const state = JSON.parse(await readFile('bridge-state.json', 'utf8'));
									if (state.error) throw new Error(state.error);
									return state;
								},
				screenshot: async ({ path }) => writeFile(path, 'mock screenshot'),
			}),
		}) };
	`
	);
	return { root, run };
}

test(
	'CLI lifecycle, lock exclusion, auth, snapshots, artifacts and safe stop',
	{ timeout: 25000 },
	async (t) => {
		const { root, run } = await fixture(t);
		assert.match(await storybookExecutable(root), /actual-bin\.mjs$/);
		assert.equal((await run('--help')).ok, true);
		assert.equal((await run('unknown')).ok, false);
		assert.equal((await run('start', '--bad', 'x')).ok, false);
		assert.equal((await run('status')).phase, 'stopped');
		const started = await run('start', '--timeout', '8000');
		assert.equal(started.ok, true, JSON.stringify(started));
		assert.equal(started.phase, 'running');
		assert.equal(started.headed, false);
		assert.equal(
			JSON.parse(await readFile(path.join(root, 'browser-options.json'), 'utf8')).headless,
			true
		);
		assert.equal((await run('start')).ok, false);
		assert.equal((await run('status')).session, started.session);
		const manifest = JSON.parse(
			await readFile(path.join(root, '.simulacrum-dev/session.json'), 'utf8')
		);
		const forbidden = await fetch(`http://127.0.0.1:${manifest.port}/status`);
		assert.equal(forbidden.status, 403);
		const origin = await fetch(`http://127.0.0.1:${manifest.port}/status`, {
			headers: {
				authorization: `Bearer ${manifest.token}`,
				'x-devkit-session': manifest.session,
				origin: 'http://evil.invalid',
			},
		});
		assert.equal(origin.status, 403);
		assert.equal((await run('snapshot')).snapshot.generation, 'fixture-1');
		assert.equal((await run('logs')).entries.length > 0, true);
		const screenshot = await run('screenshot');
		assert.equal(
			path.dirname(screenshot.path),
			path.join(root, '.simulacrum-dev/artifacts', started.session)
		);
		assert.equal((await stat(screenshot.path)).isFile(), true);
		assert.equal((await run('stop')).phase, 'stopped');
		assert.equal(await readFile(path.join(root, 'storybook-stopped'), 'utf8'), 'yes');
		assert.equal((await run('stop')).phase, 'stopped');
		assert.equal((await run('status')).phase, 'stopped');
	}
);

test(
	'action transport authenticates, bounds bodies, and preserves structured errors without poisoning session',
	{ timeout: 15000 },
	async (t) => {
		const { root, run } = await fixture(t);
		assert.equal((await run('start', '--timeout', '8000')).ok, true);
		const manifest = JSON.parse(
			await readFile(path.join(root, '.simulacrum-dev/session.json'), 'utf8')
		);
		const endpoint = `http://127.0.0.1:${manifest.port}/action`;
		assert.equal((await fetch(endpoint, { method: 'POST', body: '{}' })).status, 403);
		await assert.rejects(
			request(manifest, '/action', { method: 'POST', body: { command: 'eval' } }),
			(error) => error.code === 'INVALID_ACTION'
		);
		assert.throws(
			() =>
				request(manifest, '/action', {
					method: 'POST',
					body: { value: 'x'.repeat(65536) },
				}),
			/size limit/
		);
		const headers = {
			authorization: `Bearer ${manifest.token}`,
			'x-devkit-session': manifest.session,
			'content-type': 'application/json',
		};
		assert.equal((await fetch(endpoint, { method: 'POST', headers, body: '{' })).status, 400);
		assert.equal(
			(
				await fetch(endpoint, {
					method: 'POST',
					headers: { ...headers, origin: 'http://evil.invalid' },
					body: '{}',
				})
			).status,
			403
		);
		assert.equal(
			(await run('click', '--role', 'invalid', '--name', 'Build')).code,
			'INVALID_ACTION'
		);
		assert.equal((await run('status')).phase, 'running');
		assert.equal((await run('stop')).phase, 'stopped');
	}
);

test(
	'headed flag launches visibly, reports mode, and rejects invalid flags',
	{ timeout: 20000 },
	async (t) => {
		const { root, run } = await fixture(t);
		for (const args of [
			['start', '--headed', '--headed'],
			['start', '--headed', 'false'],
			['status', '--headed'],
			['start', '--headed=true'],
		])
			assert.equal((await run(...args)).ok, false);
		const started = await run('start', '--headed', '--timeout', '8000');
		assert.equal(started.ok, true, JSON.stringify(started));
		assert.equal(started.headed, true);
		assert.equal((await run('status')).headed, true);
		assert.equal(
			JSON.parse(await readFile(path.join(root, 'browser-options.json'), 'utf8')).headless,
			false
		);
		assert.equal((await run('snapshot')).ok, true);
		assert.equal((await run('stop')).phase, 'stopped');
	}
);

test(
	'status separates running lifecycle from historical compiler readiness',
	{ timeout: 20000 },
	async (t) => {
		const { root, run } = await fixture(t);
		const started = await run('start', '--timeout', '8000');
		assert.equal(started.ok, true, JSON.stringify(started));
		assert.equal(started.phase, 'running');
		assert.equal(started.readiness.live, false);
		assert.equal(started.readiness.lastObservation.compilerReady, true);
		assert.equal(Number.isNaN(Date.parse(started.readiness.lastObservation.observedAt)), false);

		await writeFile(
			path.join(root, 'bridge-state.json'),
			JSON.stringify({ compilerReady: false, generation: 'fixture-2' })
		);
		// Status is explicitly historical and never silently samples or waits on the browser.
		assert.deepEqual((await run('status')).readiness, started.readiness);
		assert.equal((await run('snapshot')).snapshot.compilerReady, false);
		const notReady = await run('status');
		assert.equal(notReady.phase, 'running');
		assert.equal(notReady.readiness.live, false);
		assert.equal(notReady.readiness.lastObservation.compilerReady, false);
		assert.equal(notReady.readiness.lastObservation.generation, 'fixture-2');

		await writeFile(
			path.join(root, 'bridge-state.json'),
			JSON.stringify({ error: 'Fixture bridge unavailable' })
		);
		assert.equal((await run('snapshot')).ok, false);
		const unavailable = await run('status');
		assert.equal(unavailable.phase, 'failed');
		assert.equal(unavailable.readiness.lastObservation.compilerReady, null);
		assert.equal(unavailable.readiness.lastObservation.generation, null);
		assert.match(unavailable.readiness.lastObservation.error, /bridge unavailable/);
		assert.equal((await run('stop')).phase, 'stopped');
	}
);

test(
	'stale manifest never authorizes POST stop or PID signalling',
	{ timeout: 15000 },
	async (t) => {
		const { root, run } = await fixture(t);
		const calls = [];
		const unrelated = http.createServer((req, res) => {
			calls.push(`${req.method} ${req.url}`);
			res.end(JSON.stringify({ phase: 'ready' }));
		});
		await new Promise((resolve) => unrelated.listen(0, '127.0.0.1', resolve));
		t.after(() => {
			unrelated.closeAllConnections();
			unrelated.close();
		});
		const session = secret();
		await mkdir(path.join(root, '.simulacrum-dev/lock'), { recursive: true });
		await writeFile(path.join(root, '.simulacrum-dev/lock/owner'), session);
		await writeFile(
			path.join(root, '.simulacrum-dev/session.json'),
			JSON.stringify({
				protocol: PROTOCOL,
				session,
				token: secret(),
				port: unrelated.address().port,
				pid: process.pid,
			})
		);
		const result = await run('stop');
		assert.equal(result.ok, false);
		assert.match(result.error, /identity mismatch/);
		assert.deepEqual(calls, ['GET /status']);
		assert.equal((await run('start')).ok, false);
		assert.equal(
			await readFile(path.join(root, '.simulacrum-dev/lock/owner'), 'utf8'),
			session
		);
	}
);

test(
	'unavailable Storybook executable reports startup failure and releases lock',
	{ timeout: 15000 },
	async (t) => {
		const { root, run } = await fixture(t);
		// Shadow both candidates so resolution cannot escape to the real parent installation.
		for (const name of ['storybook', '@storybook/cli']) {
			await mkdir(path.join(root, 'node_modules', name), { recursive: true });
			await writeFile(
				path.join(root, 'node_modules', name, 'package.json'),
				JSON.stringify({ name })
			);
		}
		const result = await run('start', '--timeout', '3000');
		assert.equal(result.ok, false);
		assert.match(result.error, /No installed Storybook executable found/);
		assert.equal((await run('status')).phase, 'stopped');
	}
);

test('startup deadline cleans up owned child and lock', { timeout: 20000 }, async (t) => {
	const { root, run } = await fixture(t, false);
	const result = await run('start', '--timeout', '1500');
	assert.equal(result.ok, false);
	assert.match(result.error, /timed out|deadline|exited/);
	assert.equal((await run('status')).phase, 'stopped');
	assert.equal(await readFile(path.join(root, 'storybook-stopped'), 'utf8'), 'yes');
});
