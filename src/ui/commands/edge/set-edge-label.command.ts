import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore, getIDEStore, getStoryStore, getDisplayStore } from '../get-stores.util';

export function setEdgeLabel(
	hostStore: StoreApi<HostState>,
	storyId: string,
	edgeId: string,
	text?: string
) {
	const { setEdgeData, addToEdgeMap } = getStoryStore(hostStore, storyId).getState();

	setEdgeData(edgeId, {
		label: text,
	});

	addToEdgeMap(edgeId, {
		data: {
			label: text,
		},
	});
}
