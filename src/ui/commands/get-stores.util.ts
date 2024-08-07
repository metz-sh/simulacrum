import { StoreApi } from 'zustand';
import { HostState } from '../state-managers/host/host.state';

export function getStoresFromHost(hostStore: StoreApi<HostState>) {
	return hostStore.getState().stores;
}

export function getDisplayStore(hostStore: StoreApi<HostState>) {
	return getStoresFromHost(hostStore).display;
}

export function getCodeDaemonStore(hostStore: StoreApi<HostState>) {
	return getStoresFromHost(hostStore).codeDaemonStore;
}

export function getStoresFromCodeDaemon(hostStore: StoreApi<HostState>) {
	return getCodeDaemonStore(hostStore).getState().stores;
}

export function getIDEStore(hostStore: StoreApi<HostState>) {
	return getStoresFromCodeDaemon(hostStore).ideStore;
}

export function getNotesStore(hostStore: StoreApi<HostState>) {
	return getStoresFromCodeDaemon(hostStore).notesStore;
}

export function getProjectStore(hostStore: StoreApi<HostState>) {
	return getStoresFromCodeDaemon(hostStore).projectStore;
}

export function getStoriesStore(hostStore: StoreApi<HostState>) {
	return getStoresFromHost(hostStore).stories;
}

export function getStoryStore(hostStore: StoreApi<HostState>, id: string) {
	return getStoresFromHost(hostStore).stories.getState().stories[id];
}
