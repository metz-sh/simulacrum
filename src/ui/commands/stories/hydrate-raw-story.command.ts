import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getCodeDaemonStore, getStoryStore } from '../get-stores.util';
import { Runtime } from '../../../runtime/runtime';
import { getBuiltArtifacts } from '../code-daemon/get-built-artifacts.command';
import { createStandardLibrary } from '../../../std/std';
import { noop } from 'lodash';

export function hydrateStoryScript(
	compiledScript: string,
	bundle: string,
	runtime: Runtime,
	projectName: string
) {
	const script = `${bundle}\n\n${compiledScript}`;
	const __runtime = runtime;
	const std = createStandardLibrary(runtime, projectName);
	noop(__runtime, std);
	eval(script);
}

export function hydrateStoryScriptFromStore(hostStore: StoreApi<HostState>, storyId: string) {
	const projectName = hostStore.getState().baseProps.projectName;
	const artifacts = getBuiltArtifacts(hostStore);

	const storyStore = getStoryStore(hostStore, storyId);
	const script = storyStore.getState().script;
	try {
		hydrateStoryScript(
			script.compiled,
			artifacts.bundle,
			storyStore.getState().runtime,
			projectName
		);
	} catch (error) {
		storyStore.getState().setErrors([error]);
	}
}
