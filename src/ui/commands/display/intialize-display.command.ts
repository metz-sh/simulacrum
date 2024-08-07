import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore, getIDEStore, getStoryStore, getDisplayStore } from '../get-stores.util';
import { XYPosition } from 'reactflow';
import { DisplayState } from '../../state-managers/display/display.state';

export function initializeDisplay(
	hostStore: StoreApi<HostState>,
	params: Partial<Pick<DisplayState, 'resolutionNodeMap'>>
) {
	const { set } = getDisplayStore(hostStore).getState();
	set(params);
}
