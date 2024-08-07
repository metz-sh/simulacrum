import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore, getIDEStore } from '../get-stores.util';

export function move(hostStore: StoreApi<HostState>, oldPath: string, newPath: string) {
	const projectState = getProjectStore(hostStore).getState();
	return projectState.move(oldPath, newPath);
}
