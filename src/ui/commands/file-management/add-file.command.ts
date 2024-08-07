import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore, getIDEStore } from '../get-stores.util';

export function addFile(hostStore: StoreApi<HostState>, path: string, value: string) {
	const projectState = getProjectStore(hostStore).getState();
	const ideState = getIDEStore(hostStore).getState();

	projectState.addProjectFile(path, value);
	ideState.setActiveFilePath(path);
}
