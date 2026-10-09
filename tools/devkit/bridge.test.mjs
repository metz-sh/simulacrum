import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

async function moduleURL(file, replacements = {}) {
	let source = await readFile(new URL(file, import.meta.url), 'utf8');
	for (const [from, to] of Object.entries(replacements)) source = source.replace(from, to);
	const compiled = ts.transpileModule(source, {
		compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
	}).outputText;
	return `data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`;
}
const serializationURL = await moduleURL('./serialization.ts');
const { registerHost } = await import(
	await moduleURL('./bridge.ts', { './serialization': serializationURL })
);

function observable(initial) {
	let state = initial;
	const listeners = new Set();
	return {
		getState: () => state,
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		update(patch) {
			const previous = state;
			state = { ...state, ...patch };
			for (const listener of [...listeners]) listener(state, previous);
		},
		listeners,
	};
}
function fixture() {
	class Counter {
		value = 0;
	}
	const counter = new Counter();
	const code = observable({
		isCompilerServiceReady: false,
		build: { state: 'uninitiated' },
		preview: { state: 'uninitiated' },
		compiledProjectVersion: 0,
		stores: {
			projectStore: { getState: () => ({ name: 'Counter', version: 3 }) },
			ideStore: {
				getState: () => ({ editor: { _tag: 'None' }, globalLibraryInitialized: false }),
			},
		},
	});
	const heap = [{ address: 'counter_1', instance: counter }];
	const story = {
		id: 'counter',
		title: 'Counter',
		isFinished: false,
		flowPlayerProps: { mode: 'manual', speed: '1x' },
		resolution: 'HIGH',
		renderTokens: [1],
		runtime: {
			entities: () => ({ tick: 2, flows: { active: [{}], suspended: [], completed: [] } }),
			getHeap: () => ({ list: () => heap }),
		},
		nodes: [{}, {}],
		edges: [{}],
		errors: [new Error('failure'), undefined],
	};
	const stories = Object.fromEntries(
		Array.from({ length: 51 }, (_, i) => [i, { getState: () => story }])
	);
	const store = observable({
		stores: { codeDaemonStore: code, stories: { getState: () => ({ stories }) } },
	});
	return { store, code, story, counter, heap };
}
function environment(t) {
	const previous = Object.fromEntries(
		['window', 'document', 'getComputedStyle'].map((key) => [key, globalThis[key]])
	);
	globalThis.window = new EventTarget();
	globalThis.document = { querySelectorAll: () => [] };
	t.after(() => {
		window.__SIMULACRUM_DEVKIT__?.dispose();
		for (const [key, value] of Object.entries(previous)) {
			if (value === undefined) delete globalThis[key];
			else globalThis[key] = value;
		}
	});
}
const diagnostic = {
	sourceable: true,
	fileName: '/project/counter.ts',
	message: 'Invalid operation',
	position: { startLine: 1, startCharacter: 2, endLine: 3, endCharacter: 4 },
	code: 123,
	highlights: ['operation'],
	type: 'syntactic',
};

test('bridge observes fresh state, structured build/preview errors and bounded stories', (t) => {
	environment(t);
	const { store, code } = fixture();
	assert.equal(registerHost(store), store);
	const bridge = window.__SIMULACRUM_DEVKIT__;
	const first = bridge.snapshot();
	assert.equal(first.compilerReady, false);
	assert.deepEqual(first.editor, {
		mounted: false,
		globalsReady: false,
		compiledProjectVersion: 0,
		loadingOverlayVisible: false,
	});
	document.querySelectorAll = () => [
		{ getBoundingClientRect: () => ({ width: 100, height: 100 }) },
	];
	globalThis.getComputedStyle = () => ({ visibility: 'visible', display: 'block', opacity: '1' });
	assert.equal(bridge.snapshot().editor.loadingOverlayVisible, true);
	globalThis.getComputedStyle = () => ({ visibility: 'visible', display: 'block', opacity: '0' });
	assert.equal(bridge.snapshot().editor.loadingOverlayVisible, false);
	document.querySelectorAll = () => [];
	code.getState().stores.ideStore.getState = () => ({
		editor: { _tag: 'Some' },
		globalLibraryInitialized: true,
	});
	code.update({ compiledProjectVersion: 1 });
	assert.equal(bridge.snapshot().editor.mounted, true);
	assert.equal(bridge.snapshot().editor.compiledProjectVersion, 1);
	assert.equal(first.storyCount, 51);
	assert.equal(first.stories.length, 50);
	assert.equal(first.storiesTruncated, true);
	assert.deepEqual(first.stories[0].flows, { active: 1, suspended: 0, completed: 0 });
	assert.deepEqual(first.stories[0].errors, ['failure', 'undefined']);
	code.update({
		isCompilerServiceReady: true,
		build: { state: 'errored', errors: Array(25).fill(diagnostic) },
		preview: { state: 'errored', errors: [diagnostic] },
	});
	const failed = bridge.snapshot();
	assert.equal(failed.compilerReady, true);
	assert.equal(failed.build.errors.length, 20);
	assert.deepEqual(failed.build.errors[0], diagnostic);
	assert.deepEqual(failed.preview, {
		state: 'errored',
		projectVersion: null,
		errors: [diagnostic],
	});
	assert.equal(failed.generation, first.generation);
	code.update({
		build: { state: 'built', artificats: { projectVersion: 3 } },
		preview: { state: 'built', artificats: { projectVersion: 2 } },
	});
	assert.equal(bridge.snapshot().build.projectVersion, 3);
	assert.equal(bridge.snapshot().preview.projectVersion, 2);
	assert.doesNotThrow(() => JSON.stringify(bridge.snapshot()));
});

test('revision counts build reference notifications, including preflight failures between snapshots', (t) => {
	environment(t);
	const { store, code } = fixture();
	registerHost(store);
	const bridge = window.__SIMULACRUM_DEVKIT__;
	assert.equal(bridge.snapshot().build.revision, 0);
	code.update({ compiledProjectVersion: 2 });
	code.update({ preview: { state: 'processing' } });
	code.update({ build: code.getState().build });
	assert.equal(bridge.snapshot().build.revision, 0);
	code.update({ build: { state: 'processing' } });
	code.update({ build: { state: 'built', artificats: { projectVersion: 3 } } });
	code.update({ lastSuccessfulBuild: code.getState().build });
	assert.equal(bridge.snapshot().build.revision, 2);
	code.update({ build: { state: 'errored', errors: [diagnostic] } });
	code.update({ build: { state: 'errored', errors: [diagnostic] } });
	assert.equal(bridge.snapshot().build.revision, 4);
	assert.equal(bridge.snapshot().build.revision, 4);
	registerHost(store);
	assert.equal(window.__SIMULACRUM_DEVKIT__, bridge);
	assert.equal(code.listeners.size, 1);
	assert.equal(store.listeners.size, 1);
});

test('replacement, code-store replacement, disposal and pagehide release subscriptions', (t) => {
	environment(t);
	const first = fixture();
	registerHost(first.store);
	const old = window.__SIMULACRUM_DEVKIT__;
	const generation = old.snapshot().generation;
	const second = fixture();
	registerHost(second.store);
	assert.equal(first.code.listeners.size, 0);
	assert.equal(first.store.listeners.size, 0);
	assert.throws(() => old.snapshot(), /disposed/);
	assert.notEqual(window.__SIMULACRUM_DEVKIT__.snapshot().generation, generation);
	assert.equal(window.__SIMULACRUM_DEVKIT__.snapshot().build.revision, 0);
	const replacement = fixture().code;
	second.store.update({
		stores: { ...second.store.getState().stores, codeDaemonStore: replacement },
	});
	assert.equal(second.code.listeners.size, 0);
	assert.equal(replacement.listeners.size, 1);
	assert.equal(second.store.listeners.size, 1);
	window.dispatchEvent(new Event('pagehide'));
	assert.equal(replacement.listeners.size, 0);
	assert.equal(second.store.listeners.size, 0);
	window.__SIMULACRUM_DEVKIT__.dispose();
	registerHost(second.store);
	assert.equal(replacement.listeners.size, 1);
});

test('heap exposes detached Counter data 0 -> 1, playback, resolution and token state', (t) => {
	environment(t);
	const { store, story, counter, heap } = fixture();
	registerHost(store);
	const bridge = window.__SIMULACRUM_DEVKIT__;
	const before = bridge.snapshot().stories[0];
	assert.deepEqual(before.heap, {
		objects: [{ address: 'counter_1', className: 'Counter', data: { value: 0 } }],
		truncated: false,
	});
	assert.deepEqual(before.playback, { mode: 'manual', speed: '1x' });
	assert.equal(before.resolution, 'HIGH');
	assert.equal(before.renderPending, false);
	counter.value = 1;
	story.renderTokens.pop();
	assert.equal(bridge.snapshot().stories[0].renderPending, true);
	assert.equal(bridge.snapshot().stories[0].heap.objects[0].data.value, 1);
	assert.equal(before.heap.objects[0].data.value, 0);
	story.renderTokens.push(1);
	assert.equal(bridge.snapshot().stories[0].renderPending, false);
	heap.push(...Array(50).fill(heap[0]));
	assert.equal(bridge.snapshot().stories[0].heap.objects.length, 50);
	assert.equal(bridge.snapshot().stories[0].heap.truncated, true);
});

test('diagnostic accessors/coercion hooks are not invoked and errors stay bounded', (t) => {
	environment(t);
	const { store, code } = fixture();
	let calls = 0;
	const error = {
		...diagnostic,
		get extra() {
			calls++;
			throw Error('getter');
		},
		toJSON() {
			calls++;
		},
		message: 'x'.repeat(100000),
	};
	error.self = error;
	code.update({ build: { state: 'errored', errors: [error, new Error('native failure')] } });
	registerHost(store);
	const errors = window.__SIMULACRUM_DEVKIT__.snapshot().build.errors;
	assert.equal(errors[0].extra, '[Accessor]');
	assert.equal(errors[0].self, '[Circular]');
	assert.equal(errors[0].fileName, diagnostic.fileName);
	assert.equal(errors[1].message, 'native failure');
	assert.ok(errors[0].message.length <= 2011);
	assert.equal(calls, 0);
	assert.doesNotThrow(() => JSON.stringify(errors));
});
