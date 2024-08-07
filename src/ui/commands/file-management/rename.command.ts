import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore, getIDEStore } from '../get-stores.util';

export function rename(hostStore: StoreApi<HostState>, path: string, name: string) {
	const projectState = getProjectStore(hostStore).getState();
	return projectState.rename(path, name);
}
