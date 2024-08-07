import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getStoryStore } from '../get-stores.util';

export function getScript(
	hostStore: StoreApi<HostState>,
	params: {
		storyId: string;
	}
) {
	const storyStore = getStoryStore(hostStore, params.storyId);
	return storyStore.getState().script;
}
