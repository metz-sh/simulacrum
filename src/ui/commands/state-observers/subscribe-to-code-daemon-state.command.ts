import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getCodeDaemonStore, getProjectStore, getStoriesStore } from '../get-stores.util';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

export default function subscribeToCodeDaemonState(hostStore: StoreApi<HostState>) {
	const codeDaemonStore = getCodeDaemonStore(hostStore);
	const subject = hostStore.getState().getHostSubject<'build'>();
	codeDaemonStore.subscribe(
		(selector) => ({
			build: selector.build,
		}),
		(newState) => {
			subject.next({
				source: 'build',
				newState: newState.build,
			});
		},
		{
			equalityFn: shallow,
		}
	);
}
