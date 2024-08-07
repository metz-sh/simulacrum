import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore, getStoriesStore } from '../get-stores.util';
import { StoryStore } from '../../state-managers/story/story.store';
import { shallow } from 'zustand/shallow';
import { parseStoriesState } from './subscribe-to-stories-state.command';

export default function subscribeToStoryState(
	hostStore: StoreApi<HostState>,
	storyStore: StoryStore
) {
	const subject = hostStore.getState().getHostSubject<'storySetups'>();
	storyStore.subscribe(
		(selector) => ({
			id: selector.id,
			title: selector.title,
			script: selector.script,
			resolutionNodeMap: selector.resolutionNodeMap,
			edgeMap: selector.edgeMap,
		}),
		(_) => {
			subject.next({
				source: 'storySetups',
				newState: parseStoriesState(getStoriesStore(hostStore).getState()),
			});
		},
		{
			equalityFn: shallow,
		}
	);
}
