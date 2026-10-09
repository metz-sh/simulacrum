import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { delay, readManifest, request } from './core.mjs';

const execute = promisify(execFile);
const root = fileURLToPath(new URL('../../', import.meta.url));
const cli = fileURLToPath(new URL('./cli.mjs', import.meta.url));
const directory = path.join(root, '.simulacrum-dev');
const title = 'Increment counter';
const invalidSource =
	'@Injectable class Counter { @Show value: number = "bad"; increment() { this.value += 1; return this.value; } }';
const validSource =
	'@Injectable class Counter { @Show value: number = 0; increment() { this.value += 1; return this.value; } }';
const deadline = Date.now() + 150000;
const evidence = {
	scope: 'Live UI workflow, not replay validation',
	actions: [],
	snapshots: [],
	assertions: [],
	screenshots: [],
};

function budget(maximum = 10000) {
	const remaining = deadline - Date.now();
	assert.ok(remaining > 0, 'Workflow exceeded its 150 second work deadline');
	return Math.min(remaining, maximum);
}

async function command(...args) {
	try {
		const { stdout } = await execute(process.execPath, [cli, ...args], {
			cwd: root,
			timeout: budget(80000),
			maxBuffer: 4 * 1024 * 1024,
		});
		return JSON.parse(stdout);
	} catch (error) {
		throw new Error(error.stdout || error.message);
	}
}

function check(name, condition, details) {
	evidence.assertions.push({ name, passed: Boolean(condition), details });
	assert.ok(condition, name);
}

function story(snapshot) {
	const matches = snapshot.stories.filter((item) => item.title === title);
	assert.equal(matches.length, 1, 'Expected exactly one counter story');
	return matches[0];
}

function counter(snapshot) {
	const objects = story(snapshot).heap.objects.filter((item) => item.className === 'Counter');
	assert.equal(objects.length, 1, 'Expected exactly one Counter instance');
	return objects[0].data.value;
}

async function main() {
	assert.equal(
		(await command('status')).phase,
		'stopped',
		'Stop your existing session before the live workflow'
	);
	// CLI startup owns failure cleanup; allow its timeout plus cleanup before execFile expires.
	const started = await command('start', '--timeout', '60000');
	let manifest;
	let failure;
	const evidenceFile = path.join(started.artifacts, 'workflow-evidence.json');
	try {
		manifest = await readManifest(path.join(directory, 'session.json'));
		assert.equal(manifest.session, started.session, 'Started session identity changed');
		const observe = async (label) => {
			const { snapshot } = await request(manifest, '/snapshot', { timeout: budget() });
			evidence.snapshots.push({ label, snapshot });
			return snapshot;
		};
		const action = async (input) => {
			const entry = { input, at: new Date().toISOString() };
			evidence.actions.push(entry);
			try {
				entry.result = await request(manifest, '/action', {
					method: 'POST',
					body: input,
					timeout: budget((input.timeout ?? 8000) + 2000),
				});
				return entry.result;
			} catch (error) {
				entry.error = { message: error.message, code: error.code, details: error.details };
				throw error;
			}
		};
		const waitFor = async (label, predicate, maximum = 20000) => {
			const until = Date.now() + budget(maximum);
			for (;;) {
				const snapshot = await observe(label);
				if (predicate(snapshot)) return snapshot;
				assert.ok(Date.now() < until, `Timed out: ${label}`);
				await delay(150);
			}
		};
		const screenshot = async (label) => {
			const result = await request(manifest, '/screenshot', {
				method: 'POST',
				timeout: budget(),
			});
			const image = await readFile(result.path);
			check(
				`${label}: valid PNG`,
				image.subarray(0, 8).toString('hex') === '89504e470d0a1a0a'
			);
			evidence.screenshots.push({ label, path: result.path });
		};

		await action({ command: 'wait', stage: 'editor', timeout: 30000 });
		const dom = await action({ command: 'dom' });
		check('DOM exposes Build button', /button "Build"/.test(dom.dom), dom.dom);
		const textboxes = [...dom.dom.matchAll(/textbox "((?:[^"\\]|\\.)*)"/g)].map((match) =>
			JSON.parse(`"${match[1]}"`)
		);
		const editorNames = [...new Set(textboxes.filter((name) => /editor content/i.test(name)))];
		check('DOM identifies one Monaco editor', editorNames.length === 1, editorNames);
		const editor = { role: 'textbox', name: editorNames[0] };
		const replace = async (source) => {
			await action({ command: 'press', ...editor, value: 'ControlOrMeta+A' });
			await action({ command: 'fill', ...editor, value: source });
		};

		const initial = await observe('before invalid edit');
		await replace(invalidSource);
		const invalid = await waitFor(
			'invalid edit settled',
			(snapshot) =>
				snapshot.project.version !== initial.project.version &&
				snapshot.preview.state === 'errored'
		);
		check(
			'Invalid edit advanced project version and errored preview',
			invalid.project.version > initial.project.version && invalid.preview.errors.length > 0
		);
		const rejected = (await action({ command: 'build', timeout: 20000 })).snapshot;
		check(
			'Real Build rejects current source with a new revision',
			rejected.build.state === 'errored' &&
				rejected.build.revision > invalid.build.revision &&
				rejected.project.version === invalid.project.version &&
				rejected.build.projectVersion === null,
			rejected.build
		);
		check(
			'Build error retains structured source location',
			rejected.build.errors.some(
				(error) =>
					typeof error.fileName === 'string' &&
					error.fileName.endsWith('counter.ts') &&
					error.position !== null &&
					typeof error.position === 'object'
			),
			rejected.build.errors
		);
		await screenshot('type error');

		await replace(validSource);
		const restored = await waitFor(
			'valid edit settled',
			(snapshot) =>
				snapshot.project.version > invalid.project.version &&
				snapshot.preview.state === 'built' &&
				snapshot.preview.projectVersion === snapshot.project.version
		);
		const built = (await action({ command: 'build', timeout: 20000 })).snapshot;
		check(
			'Successful Build has a new revision and current version',
			built.build.state === 'built' &&
				built.build.revision > restored.build.revision &&
				built.build.projectVersion === restored.project.version &&
				built.project.version === restored.project.version,
			built.build
		);
		const hydrated = (
			await action({ command: 'wait', stage: 'story', story: title, timeout: 20000 })
		).snapshot;
		check('Hydrated Counter.value is 0', counter(hydrated) === 0);
		await action({ command: 'story', story: title, action: 'step', timeout: 20000 });
		const stepped = await waitFor(
			'step value 1',
			(snapshot) => counter(snapshot) === 1 && !story(snapshot).renderPending
		);
		check('Step changes Counter.value to 1', counter(stepped) === 1);
		await action({ command: 'story', story: title, action: 'reset', timeout: 20000 });
		const reset = await waitFor(
			'reset value 0',
			(snapshot) => counter(snapshot) === 0 && !story(snapshot).renderPending
		);
		check('Reset restores Counter.value to 0', counter(reset) === 0 && !story(reset).finished);
		await action({ command: 'story', story: title, action: 'play', timeout: 20000 });
		const completed = await waitFor(
			'playback completion',
			(snapshot) => story(snapshot).finished && !story(snapshot).renderPending,
			30000
		);
		check(
			'Playback completes with Counter.value 1 and no story errors',
			counter(completed) === 1 && story(completed).errors.length === 0,
			story(completed)
		);
		await screenshot('completed playback');
	} catch (error) {
		failure = error;
		evidence.failure = { message: error.message, code: error.code, details: error.details };
	} finally {
		// Never stop a replacement manifest or use persisted PIDs as cleanup authority.
		if (manifest?.session === started.session) {
			try {
				try {
					evidence.logs = await request(manifest, '/logs?limit=500', { timeout: 3000 });
					if (failure) {
						evidence.finalSnapshot = await request(manifest, '/snapshot', {
							timeout: 3000,
						});
						evidence.screenshots.push({
							label: 'failure',
							...(await request(manifest, '/screenshot', {
								method: 'POST',
								timeout: 3000,
							})),
						});
					}
				} catch (error) {
					evidence.observationError = error.message;
				}
			} finally {
				try {
					await request(manifest, '/stop', { method: 'POST', timeout: 3000 });
					const until = Date.now() + 10000;
					for (;;) {
						try {
							if (
								(await readFile(path.join(directory, 'lock/owner'), 'utf8')) !==
								started.session
							)
								break;
						} catch (error) {
							if (error.code === 'ENOENT') break;
							throw error;
						}
						assert.ok(Date.now() < until, 'Owned session cleanup was not confirmed');
						await delay(100);
					}
					evidence.stopped = true;
				} catch (error) {
					evidence.cleanupError = error.message;
					failure ??= error;
				}
			}
		}
		evidence.ok = !failure;
		// Keep endpoint credentials out of evidence, including any echoed log strings.
		let serialized = JSON.stringify(
			evidence,
			(key, value) =>
				['token', 'session', 'authorization'].includes(key) ? undefined : value,
			2
		);
		if (manifest?.token) serialized = serialized.replaceAll(manifest.token, '[REDACTED]');
		await writeFile(evidenceFile, serialized, { mode: 0o600 });
	}
	if (failure) throw new Error(`${failure.message}; evidence: ${evidenceFile}`);
	return {
		ok: true,
		stopped: evidence.stopped,
		evidence: evidenceFile,
		assertions: evidence.assertions.length,
	};
}

try {
	console.log(JSON.stringify(await main()));
} catch (error) {
	console.error(JSON.stringify({ ok: false, error: error.message }));
	process.exitCode = 1;
}
