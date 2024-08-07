import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore, getIDEStore } from '../get-stores.util';

export function deleteFolder(hostStore: StoreApi<HostState>, path: string) {
	const projectState = getProjectStore(hostStore).getState();
	projectState.deleteFolder(path);
}
