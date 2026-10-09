import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promisify } from 'node:util';
import { delay, readManifest, request } from './core.mjs';

const execute = promisify(execFile);
const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = fileURLToPath(new URL('./cli.mjs', import.meta.url));
const manifestFile = path.join(root, '.simulacrum-dev/session.json');

async function command(...args) {
	try {
		const { stdout } = await execute(process.execPath, [cli, ...args], {
			cwd: root,
			timeout: 140000,
			maxBuffer: 4 * 1024 * 1024,
		});
		return JSON.parse(stdout);
	} catch (error) {
		throw new Error(error.stdout || error.message);
	}
}

async function main() {
	// Refuse existing sessions; this check never stops or attaches to someone else's work.
	assert.equal(
		(await command('status')).phase,
		'stopped',
		'Stop your existing session before the live smoke check'
	);
	const started = await command('start', '--timeout', '120000');
	const manifest = await readManifest(manifestFile);
	assert.equal(manifest.session, started.session);
	let result;
	try {
		const status = await request(manifest, '/status');
		assert.equal(status.phase, 'running');
		let snapshot;
		const editorDeadline = Date.now() + 30000;
		while (true) {
			({ snapshot } = await request(manifest, '/snapshot'));
			const editor = snapshot.editor;
			if (
				editor.mounted &&
				editor.globalsReady &&
				editor.compiledProjectVersion > 0 &&
				!editor.loadingOverlayVisible
			)
				break;
			assert.ok(Date.now() < editorDeadline, 'Editor did not finish initialization');
			await delay(250);
		}
		assert.equal(snapshot.compilerReady, true);
		assert.equal(snapshot.project.name, 'Devkit Counter');
		assert.equal(snapshot.storyCount, 1);
		assert.equal(snapshot.stories[0].id, 'counter-increment');
		const second = await request(manifest, '/snapshot');
		assert.equal(second.snapshot.generation, snapshot.generation);
		const screenshot = await request(manifest, '/screenshot', { method: 'POST' });
		const image = await readFile(screenshot.path);
		assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
		const logs = await request(manifest, '/logs?limit=500');
		await writeFile(
			path.join(started.artifacts, 'smoke-evidence.json'),
			JSON.stringify({ snapshot, logs }, null, 2)
		);
		const errors = logs.entries.filter((entry) => entry.source === 'browser:error');
		assert.deepEqual(errors, [], 'Browser errors captured; inspect smoke-evidence.json');
		result = {
			ok: true,
			session: started.session,
			screenshot: screenshot.path,
			compilerReady: snapshot.compilerReady,
			buildState: snapshot.build.state,
			generation: snapshot.generation,
		};
	} finally {
		// Use the captured authenticated endpoint, never a subsequently replaced manifest.
		await request(manifest, '/stop', { method: 'POST' });
		const deadline = Date.now() + 10000;
		while (true) {
			try {
				const owner = await readFile(path.join(root, '.simulacrum-dev/lock/owner'), 'utf8');
				if (owner !== started.session) break;
			} catch (error) {
				if (error.code === 'ENOENT') break;
				throw error;
			}
			assert.ok(Date.now() < deadline, 'Owned session cleanup was not confirmed');
			await delay(100);
		}
	}
	return { ...result, stopped: true };
}

try {
	console.log(JSON.stringify(await main()));
} catch (error) {
	console.error(JSON.stringify({ ok: false, error: error.message }));
	process.exitCode = 1;
}
