import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getIDEStore, getProjectStore } from '../get-stores.util';

export function getActiveFilePath(hostStore: StoreApi<HostState>) {
	const ideState = getIDEStore(hostStore).getState();
	return ideState.activeFilePath;
}
