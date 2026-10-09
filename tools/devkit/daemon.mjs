import http from 'node:http';
import { executeAction } from './actions.mjs';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, rename, unlink, rmdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	PROTOCOL,
	MAX_RESPONSE,
	LogRing,
	authenticated,
	bounded,
	delay,
	integer,
	allocatePort,
	storybookExecutable,
	stopChild,
	browserChannel,
} from './core.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const directory = path.join(root, '.simulacrum-dev');
const manifestFile = path.join(directory, 'session.json');
const lockDirectory = path.join(directory, 'lock');
const logs = new LogRing();
let session, token, artifactDirectory, server, storybook, browser, browserLaunch, page, manifest;
let stopping = false;
let phase = 'starting';
let failure;
let busy = false;
let startupTimer;
let lastReadinessObservation = null;
let headed = false;

function status() {
	return {
		protocol: PROTOCOL,
		session,
		phase,
		error: failure,
		headed,
		// Status must stay independent of browser RPCs so stop can authenticate a hung session.
		readiness: { live: false, lastObservation: lastReadinessObservation },
		fixtureUrl: manifest?.fixtureUrl,
		artifacts: artifactDirectory,
	};
}

async function shutdown(error) {
	if (stopping) return;
	stopping = true;
	clearTimeout(startupTimer);
	phase = 'stopping';
	if (error) logs.push('daemon', error.message ?? error);
	// The hard bound also handles unresponsive browser RPCs during shutdown.
	const hardExit = setTimeout(() => process.exit(error ? 1 : 0), 7000);
	server?.close();
	server?.closeAllConnections();
	const cleanup = await Promise.allSettled([
		browserLaunch
			? bounded(
					browserLaunch.then(
						(ownedBrowser) => ownedBrowser.close(),
						() => {}
					),
					4000
				)
			: Promise.resolve(),
		stopChild(storybook),
	]);
	if (cleanup.some((result) => result.status === 'rejected')) {
		// Retain ownership records when resource cleanup could not be confirmed.
		process.exit(1);
	}
	try {
		const owner = await readFile(path.join(lockDirectory, 'owner'), 'utf8');
		if (owner === session) {
			try {
				const current = JSON.parse(await readFile(manifestFile, 'utf8'));
				if (current.session === session) await unlink(manifestFile);
			} catch (error) {
				if (error.code !== 'ENOENT') throw error;
			}
			await unlink(path.join(lockDirectory, 'owner'));
			await rmdir(lockDirectory);
		}
	} catch (cleanupError) {
		logs.push('daemon', `Cleanup: ${cleanupError.message}`);
	}
	clearTimeout(hardExit);
	process.exit(error ? 1 : 0);
}

async function snapshot() {
	try {
		const result = await bounded(
			page.evaluate(async () => {
				const bridge = window.__SIMULACRUM_DEVKIT__;
				if (!bridge || typeof bridge.snapshot !== 'function')
					throw new Error('Fixture bridge unavailable');
				return JSON.parse(JSON.stringify(await bridge.snapshot()));
			}),
			8000,
			'Fixture snapshot timed out'
		);
		if (
			!result ||
			typeof result.compilerReady !== 'boolean' ||
			typeof result.generation !== 'string' ||
			!result.generation
		) {
			throw new Error(
				'Invalid fixture snapshot: expected compilerReady boolean and generation string'
			);
		}
		lastReadinessObservation = {
			observedAt: new Date().toISOString(),
			compilerReady: result.compilerReady,
			generation: result.generation,
			error: null,
		};
		return result;
	} catch (error) {
		lastReadinessObservation = {
			observedAt: new Date().toISOString(),
			compilerReady: null,
			generation: null,
			error: error.message,
		};
		throw error;
	}
}

function reply(res, code, body) {
	let text = JSON.stringify(body);
	if (Buffer.byteLength(text) > MAX_RESPONSE) {
		code = 413;
		text = JSON.stringify({ error: 'Response exceeds size limit' });
	}
	res.writeHead(code, {
		'content-type': 'application/json',
		'cache-control': 'no-store',
		'x-content-type-options': 'nosniff',
		'x-devkit-session': session,
		'x-devkit-protocol': PROTOCOL,
	});
	res.end(text);
}

async function handle(req, res) {
	// No CORS, browser origins, redirects, or arbitrary executable input.
	if (
		req.headers.origin ||
		req.headers.host !== `127.0.0.1:${manifest.port}` ||
		!authenticated(req.headers.authorization, `Bearer ${token}`) ||
		!authenticated(req.headers['x-devkit-session'], session)
	) {
		res.writeHead(403, { 'content-type': 'application/json' });
		res.end(JSON.stringify({ error: 'Forbidden' }));
		return;
	}
	const isAction = req.method === 'POST' && req.url === '/action';
	if (
		req.headers['transfer-encoding'] ||
		(!isAction && req.headers['content-length'] && req.headers['content-length'] !== '0')
	) {
		reply(res, 400, { error: 'Request bodies are not supported' });
		return;
	}
	try {
		const url = new URL(req.url, 'http://127.0.0.1');
		const route = `${req.method} ${url.pathname}`;
		const allowed = route === 'GET /logs' ? ['after', 'limit'] : [];
		if ([...url.searchParams.keys()].some((key) => !allowed.includes(key))) {
			throw new Error('Unknown query parameter');
		}
		if (route === 'GET /status') return reply(res, 200, status());
		if (route === 'GET /logs')
			return reply(
				res,
				200,
				logs.read(
					integer(
						url.searchParams.get('after') ?? 0,
						'after',
						0,
						Number.MAX_SAFE_INTEGER
					),
					integer(url.searchParams.get('limit') ?? 100, 'limit', 1, 500)
				)
			);
		if (route === 'POST /stop') {
			reply(res, 200, { session, stopping: true });
			res.once('finish', () => void shutdown());
			// finish may already have fired on an immediately flushed response.
			setImmediate(() => void shutdown());
			return;
		}
		if (!['GET /snapshot', 'POST /screenshot', 'POST /action'].includes(route)) {
			return reply(res, 404, { error: 'Unknown command' });
		}
		if (phase !== 'running') return reply(res, 409, { error: `Session is ${phase}` });
		if (busy) return reply(res, 409, { error: 'Browser operation already in progress' });
		busy = true;
		try {
			if (route === 'POST /action') {
				try {
					const input = await readAction(req);
					const result = await executeAction(page, snapshot, input);
					return reply(res, 200, { session, ...result });
				} catch (error) {
					return reply(res, 400, {
						session,
						error: error.message,
						code: error.code,
						details: error.details,
					});
				}
			}
			if (route === 'GET /snapshot')
				return reply(res, 200, { session, snapshot: await snapshot() });
			const name = `screenshot-${Date.now()}-${++screenshotSequence}.png`;
			const file = path.join(artifactDirectory, name);
			await page.screenshot({ path: file, timeout: 8000, fullPage: false });
			return reply(res, 200, { session, path: file });
		} catch (error) {
			// A timed-out evaluation cannot be cancelled safely; don't queue more work behind it.
			failure = error.message;
			phase = 'failed';
			throw error;
		} finally {
			busy = false;
		}
	} catch (error) {
		reply(res, 400, { error: error.message });
	}
}
let screenshotSequence = 0;

async function readAction(req) {
	if (req.headers['content-type'] !== 'application/json')
		throw new Error('Expected application/json');
	const length = integer(req.headers['content-length'], 'content-length', 1, 65536);
	return bounded(
		new Promise((resolve, reject) => {
			const chunks = [];
			let size = 0;
			req.on('data', (chunk) => {
				size += chunk.length;
				if (size > length) {
					reject(new Error('Request exceeds size limit'));
					req.destroy();
				} else chunks.push(chunk);
			});
			req.on('error', reject);
			req.on('end', () => {
				try {
					resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
				} catch (error) {
					reject(error);
				}
			});
		}),
		3000,
		'Action body timed out'
	);
}

async function start(config) {
	({ session, token } = config);
	if (typeof config.headed !== 'boolean') throw new Error('headed must be a boolean');
	headed = config.headed;
	if (!/^[a-f0-9]{64}$/.test(session) || !/^[a-f0-9]{64}$/.test(token))
		throw new Error('Invalid session');
	const timeout = integer(config.timeout, 'timeout', 1000, 180000);
	startupTimer = setTimeout(() => void shutdown(new Error('Startup deadline exceeded')), timeout);
	artifactDirectory = path.join(directory, 'artifacts', session);
	await mkdir(artifactDirectory, { recursive: true, mode: 0o700 });
	const storybookPort = await allocatePort();
	server = http.createServer((req, res) => void handle(req, res));
	server.requestTimeout = 10000;
	server.headersTimeout = 10000;
	server.timeout = 40000;
	server.maxConnections = 16;
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	manifest = {
		protocol: PROTOCOL,
		session,
		token,
		port: server.address().port,
		createdAt: new Date().toISOString(),
		fixtureUrl: `http://127.0.0.1:${storybookPort}/iframe.html?id=devkit-session--default&viewMode=story`,
	};
	const temporary = path.join(directory, `session-${session}.tmp`);
	await writeFile(temporary, JSON.stringify(manifest, null, 2), { mode: 0o600, flag: 'wx' });
	await rename(temporary, manifestFile);
	process.send?.({ type: 'listening', manifest });

	const executable = await storybookExecutable(root);
	if (stopping) return;
	logs.push('daemon', `Storybook executable: ${executable}`);
	storybook = spawn(
		process.execPath,
		[
			executable,
			'dev',
			'--host',
			'127.0.0.1',
			'--port',
			String(storybookPort),
			'--ci',
			'--no-open',
		],
		{
			cwd: root,
			detached: process.platform !== 'win32',
			stdio: ['ignore', 'pipe', 'pipe'],
			env: {
				...process.env,
				SIMULACRUM_DEVKIT: '1',
				CI: '1',
				STORYBOOK_DISABLE_TELEMETRY: '1',
			},
		}
	);
	storybook.stdout.on('data', (chunk) => logs.push('storybook:stdout', chunk.toString()));
	storybook.stderr.on('data', (chunk) => logs.push('storybook:stderr', chunk.toString()));
	storybook.on('error', (error) => void fail(error));
	storybook.on('exit', (code, signal) => {
		if (!stopping) void fail(new Error(`Storybook exited (${code ?? signal})`));
	});

	const { chromium } = await import('playwright');
	if (stopping) return;
	const channel = browserChannel(process.env.SIMULACRUM_DEVKIT_BROWSER);
	logs.push('daemon', `Browser channel: ${channel}`);
	browserLaunch = chromium.launch({
		channel,
		headless: !headed,
		timeout: Math.min(timeout, 30000),
	});
	browser = await browserLaunch;
	if (stopping) {
		await browser.close();
		return;
	}
	browser.on('disconnected', () => {
		if (!stopping) void fail(new Error('Chromium disconnected'));
	});
	page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
	page.on('console', (message) => logs.push(`browser:${message.type()}`, message.text()));
	page.on('pageerror', (error) => logs.push('browser:error', error.message));
	page.on('crash', () => void fail(new Error('Fixture page crashed')));
	page.on('close', () => {
		if (!stopping) void shutdown();
	});
	while (!stopping) {
		try {
			const response = await page.goto(manifest.fixtureUrl, {
				waitUntil: 'domcontentloaded',
				timeout: 3000,
			});
			if (response?.ok()) break;
		} catch (error) {
			logs.push('navigation', error.message);
		}
		await delay(300);
	}
	while (!stopping) {
		try {
			const state = await snapshot();
			if (state.compilerReady) {
				clearTimeout(startupTimer);
				phase = 'running';
				logs.push('daemon', `Fixture ready (generation ${state.generation})`);
				process.send?.({ type: 'ready', status: status() });
				process.disconnect?.();
				return;
			}
		} catch (error) {
			logs.push('bridge', error.message);
		}
		await delay(250);
	}
}

async function fail(error) {
	if (stopping) return;
	failure = error.message;
	try {
		process.send?.({ type: 'failed', error: failure, logs: logs.read(0, 500) });
	} catch {}
	await shutdown(error);
}

if (!process.send) {
	console.error('Run cli.mjs, not daemon.mjs directly.');
	process.exit(1);
}
const handshakeTimer = setTimeout(() => process.exit(1), 5000);
process.once('message', (config) => {
	clearTimeout(handshakeTimer);
	void start(config).catch(fail);
});
process.on('disconnect', () => {
	if (phase !== 'running' && !stopping) void shutdown(new Error('Starter disconnected'));
});
process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
process.on('uncaughtException', (error) => void fail(error));
process.on(
	'unhandledRejection',
	(error) => void fail(error instanceof Error ? error : new Error(String(error)))
);
