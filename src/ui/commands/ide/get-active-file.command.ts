import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getIDEStore, getProjectStore } from '../get-stores.util';
import { getActiveFilePath } from './get-active-file-path.command';

export function getActiveFile(hostStore: StoreApi<HostState>) {
	const projectState = getProjectStore(hostStore).getState();

	const activeFilePath = getActiveFilePath(hostStore);
	if (!activeFilePath) {
		return;
	}

	const activeFile = projectState.fileSystemTree.findFile(activeFilePath);
	return activeFile;
}
