import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getCodeDaemonStore, getStoryStore } from '../get-stores.util';

export function getBuiltArtifacts(hostStore: StoreApi<HostState>) {
	return getBuild(hostStore).artificats;
}

export function getBuild(hostStore: StoreApi<HostState>) {
	const { build } = getCodeDaemonStore(hostStore).getState();
	if (build.state !== 'built') {
		throw new Error('artifacts are not ready!');
	}

	return build;
}
