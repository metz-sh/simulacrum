import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getDisplayStore } from '../get-stores.util';
import { type DisplayState } from '../../state-managers/display/display.state';

function parseDisplayState(state: DisplayState) {
	return {
		resolutionNodeMap: state.resolutionNodeMap,
	};
}

export default function subscribeToDisplayState(hostStore: StoreApi<HostState>) {
	const diplayStore = getDisplayStore(hostStore);
	const subject = hostStore.getState().getHostSubject<'display'>();
	diplayStore.subscribe((newState) => {
		subject.next({
			source: 'display',
			newState: parseDisplayState(newState),
		});
	});
}
