import http from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const PROTOCOL = 'simulacrum-devkit-v1';
export const MAX_RESPONSE = 4 * 1024 * 1024;
export const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
export const secret = () => randomBytes(32).toString('hex');

export function browserChannel(value = 'chromium') {
	if (!['chromium', 'chrome'].includes(value)) {
		throw new Error('SIMULACRUM_DEVKIT_BROWSER must be chromium or chrome');
	}
	return value;
}

export function integer(value, name, min, max) {
	if (!/^\d+$/.test(String(value))) throw new Error(`${name} must be an integer`);
	const number = Number(value);
	if (!Number.isSafeInteger(number) || number < min || number > max) {
		throw new Error(`${name} must be between ${min} and ${max}`);
	}
	return number;
}

export function authenticated(actual, expected) {
	return (
		typeof actual === 'string' &&
		typeof expected === 'string' &&
		Buffer.byteLength(actual) === Buffer.byteLength(expected) &&
		timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
	);
}

export function bounded(promise, ms, message = 'Operation timed out') {
	let timer;
	return Promise.race([
		promise,
		new Promise((_, reject) => {
			timer = setTimeout(() => reject(new Error(message)), ms);
		}),
	]).finally(() => clearTimeout(timer));
}

export class LogRing {
	constructor(capacity = 500, maxText = 4000) {
		this.capacity = capacity;
		this.maxText = maxText;
		this.sequence = 0;
		this.entries = [];
	}
	push(source, text) {
		this.entries.push({
			cursor: ++this.sequence,
			time: new Date().toISOString(),
			source,
			text: String(text).slice(0, this.maxText),
		});
		if (this.entries.length > this.capacity) this.entries.shift();
	}
	read(after = 0, limit = 100) {
		integer(after, 'after', 0, Number.MAX_SAFE_INTEGER);
		integer(limit, 'limit', 1, 500);
		const oldest = this.entries[0]?.cursor ?? this.sequence + 1;
		const entries = this.entries.filter((entry) => entry.cursor > after).slice(0, limit);
		return {
			entries,
			nextCursor: entries.at(-1)?.cursor ?? after,
			latestCursor: this.sequence,
			truncated: after < oldest - 1,
		};
	}
}

export function validateManifest(value) {
	if (
		value?.protocol !== PROTOCOL ||
		!/^[a-f0-9]{64}$/.test(value?.token) ||
		!/^[a-f0-9]{64}$/.test(value?.session)
	)
		throw new Error('Invalid devkit manifest');
	integer(value.port, 'port', 1, 65535);
	return value;
}

export async function readManifest(file) {
	return validateManifest(JSON.parse(await readFile(file, 'utf8')));
}

export function request(manifest, route, { method = 'GET', timeout = 10000, body } = {}) {
	validateManifest(manifest);
	const payload = body === undefined ? undefined : JSON.stringify(body);
	if (payload && Buffer.byteLength(payload) > 65536)
		throw new Error('Request exceeds size limit');
	return new Promise((resolve, reject) => {
		const req = http.request(
			{
				hostname: '127.0.0.1',
				port: manifest.port,
				path: route,
				method,
				agent: false,
				headers: {
					authorization: `Bearer ${manifest.token}`,
					'x-devkit-session': manifest.session,
					...(payload === undefined
						? {}
						: {
								'content-type': 'application/json',
								'content-length': Buffer.byteLength(payload),
							}),
				},
			},
			(res) => {
				let size = 0;
				const chunks = [];
				res.on('data', (chunk) => {
					size += chunk.length;
					if (size > MAX_RESPONSE) req.destroy(new Error('Response exceeds size limit'));
					else chunks.push(chunk);
				});
				res.on('error', reject);
				res.on('end', () => {
					try {
						if (
							res.headers['x-devkit-session'] !== manifest.session ||
							res.headers['x-devkit-protocol'] !== PROTOCOL
						)
							throw new Error('Endpoint identity mismatch');
						const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
						if (res.statusCode !== 200) {
							const error = new Error(body.error ?? `HTTP ${res.statusCode}`);
							error.code = body.code;
							error.details = body.details;
							throw error;
						}
						resolve(body);
					} catch (error) {
						reject(error);
					}
				});
			}
		);
		const timer = setTimeout(() => req.destroy(new Error('Request timed out')), timeout);
		req.on('close', () => clearTimeout(timer));
		req.on('error', reject);
		req.end(payload);
	});
}

export async function allocatePort() {
	const server = http.createServer();
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const port = server.address().port;
	await new Promise((resolve) => server.close(resolve));
	return port;
}

// Resolve the installed package's declaration, not a guessed @storybook/cli path.
export async function storybookExecutable(root) {
	const require = createRequire(path.join(root, 'package.json'));
	for (const name of ['storybook', '@storybook/cli']) {
		let packageFile;
		try {
			packageFile = require.resolve(`${name}/package.json`);
		} catch {
			continue;
		}
		const pkg = JSON.parse(await readFile(packageFile, 'utf8'));
		const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin?.storybook;
		if (!bin) continue;
		const executable = path.resolve(path.dirname(packageFile), bin);
		if ((await stat(executable)).isFile()) return executable;
	}
	throw new Error('No installed Storybook executable found. Run yarn install first.');
}

// Only a live ChildProcess handle is authority to signal; never a persisted PID.
export async function stopChild(child, grace = 3000, signalGroup = process.platform !== 'win32') {
	if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
	const exited = new Promise((resolve) => child.once('exit', resolve));
	const signal = (name) => {
		if (child.exitCode !== null || child.signalCode !== null) return;
		try {
			if (signalGroup) process.kill(-child.pid, name);
			else child.kill(name);
		} catch (error) {
			if (error.code !== 'ESRCH') throw error;
		}
	};
	signal('SIGTERM');
	await bounded(exited, grace).catch(() => {});
	if (child.exitCode === null && child.signalCode === null) {
		signal('SIGKILL');
		await bounded(exited, 1000, 'Child did not exit after SIGKILL');
	}
}
