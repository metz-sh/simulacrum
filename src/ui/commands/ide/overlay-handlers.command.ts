import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getIDEStore, getProjectStore } from '../get-stores.util';

export function enableIDEOverlay(hostStore: StoreApi<HostState>) {
	const ideState = getIDEStore(hostStore).getState();
	ideState.enableOverlay();
}

export function disableIDEOverlay(hostStore: StoreApi<HostState>) {
	const ideState = getIDEStore(hostStore).getState();
	ideState.disableOverlay();
}
