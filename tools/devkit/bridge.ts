import type { StoreApi } from 'zustand';
import type { HostState } from '../../src/ui/state-managers/host/host.state';
import { createSerializer, observedClassName } from './serialization';

type CodeStore = HostState['stores']['codeDaemonStore'];
let active: { store: StoreApi<HostState>; codeStore: CodeStore; dispose: () => void } | undefined;

// Imported only by the explicitly enabled Storybook instrumentation plugin.
export function registerHost<T extends StoreApi<HostState>>(store: T): T {
	const codeStore = store.getState().stores.codeDaemonStore;
	if (active?.store === store && active.codeStore === codeStore) return store;
	active?.dispose();
	const generation = crypto.randomUUID();
	let build = codeStore.getState().build;
	let revision = 0;
	// Observe every notification, not just snapshots: processing and terminal states
	// can arrive between polls, and Monaco preflight failures skip processing entirely.
	const unsubscribeCode = codeStore.subscribe((code) => {
		if (code.build !== build) {
			build = code.build;
			revision++;
		}
	});
	const unsubscribeHost = store.subscribe(() => {
		if (store.getState().stores.codeDaemonStore !== codeStore) registerHost(store);
	});
	let disposed = false;
	const dispose = () => {
		if (disposed) return;
		disposed = true;
		unsubscribeCode();
		unsubscribeHost();
		window.removeEventListener('pagehide', dispose);
		if (active?.dispose === dispose) active = undefined;
	};
	window.addEventListener('pagehide', dispose);
	active = { store, codeStore, dispose };
	const bridge = {
		/** Release observation subscriptions; no source/runtime mutation. */
		dispose,
		snapshot() {
			if (disposed) throw new Error('Devkit observation generation has been disposed');
			const host = store.getState();
			const code = codeStore.getState();
			const project = code.stores.projectStore.getState();
			const ide = code.stores.ideStore.getState();
			const stories = Object.values(host.stores.stories.getState().stories);
			return {
				generation,
				compilerReady: code.isCompilerServiceReady,
				editor: {
					mounted: ide.editor._tag === 'Some',
					globalsReady: ide.globalLibraryInitialized,
					compiledProjectVersion: code.compiledProjectVersion,
					loadingOverlayVisible: Array.from(
						document.querySelectorAll<HTMLElement>('.mantine-LoadingOverlay-root')
					).some((element) => {
						const rect = element.getBoundingClientRect();
						const style = getComputedStyle(element);
						return (
							rect.width > 0 &&
							rect.height > 0 &&
							style.visibility !== 'hidden' &&
							style.display !== 'none' &&
							Number(style.opacity) > 0
						);
					}),
				},
				project: { name: project.name, version: project.version },
				build: {
					state: code.build.state,
					// Monotonic per generation, starting at zero for the initial reference.
					revision,
					projectVersion:
						code.build.state === 'built' ? code.build.artificats.projectVersion : null,
					errors: structuredErrors('errors' in code.build ? code.build.errors : []),
				},
				preview: {
					state: code.preview.state,
					projectVersion:
						code.preview.state === 'built'
							? code.preview.artificats.projectVersion
							: null,
					errors: structuredErrors('errors' in code.preview ? code.preview.errors : []),
				},
				storyCount: stories.length,
				stories: stories.slice(0, 50).map((storyStore) => {
					const story = storyStore.getState();
					const entities = story.runtime.entities();
					const heap = story.runtime.getHeap().list();
					const serialize = createSerializer();
					return {
						id: story.id,
						title: story.title,
						tick: entities.tick,
						finished: story.isFinished,
						playback: {
							mode: story.flowPlayerProps.mode,
							speed: story.flowPlayerProps.speed,
						},
						resolution: story.resolution,
						// The single token is consumed during rendering and returned on completion.
						renderPending: story.renderTokens.length === 0,
						heap: {
							objects: heap.slice(0, 50).map(({ address, instance }) => ({
								address,
								className: observedClassName(instance),
								data: serialize(instance),
							})),
							truncated: heap.length > 50,
						},
						flows: Object.fromEntries(
							Object.entries(entities.flows).map(([state, flows]) => [
								state,
								flows.length,
							])
						),
						nodes: story.nodes.length,
						edges: story.edges.length,
						errors: boundedErrors(story.errors),
					};
				}),
				storiesTruncated: stories.length > 50,
			};
		},
	};
	Object.defineProperty(window, '__SIMULACRUM_DEVKIT__', {
		value: bridge,
		configurable: true,
	});
	return store;
}

// CompilerError's sourceable/fileName/position/code/highlights stay structured;
// no JSON stringification or potentially user-defined coercion during observation.
function structuredErrors(errors: unknown) {
	if (!Array.isArray(errors)) return [];
	const serialize = createSerializer();
	const result = [];
	for (let i = 0; i < Math.min(errors.length, 20); i++) {
		const descriptor = Object.getOwnPropertyDescriptor(errors, String(i));
		result.push(
			descriptor && 'value' in descriptor ? serialize(descriptor.value) : '[Accessor]'
		);
	}
	return result;
}

// Keep the existing story error string surface, but stringify only detached copies.
function boundedErrors(errors: unknown) {
	return structuredErrors(errors).map((error) => {
		if (error === '[Undefined]') return 'undefined';
		if (typeof error === 'string') return error.slice(0, 2000);
		if (
			error &&
			!Array.isArray(error) &&
			typeof error === 'object' &&
			typeof error.message === 'string'
		)
			return error.message.slice(0, 2000);
		return JSON.stringify(error).slice(0, 2000);
	});
}
