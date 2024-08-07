import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore, getStoriesStore } from '../get-stores.util';
import { type StoriesState } from '../../state-managers/stories/stories.state';
import * as lodash from 'lodash';

export function parseStoriesState(state: StoriesState) {
	const mappedResult = lodash.mapValues(state.stories, (story) => {
		const storyState = story.getState();
		return {
			id: storyState.id,
			title: storyState.title,
			script: storyState.script,
			resolutionNodeMap: storyState.resolutionNodeMap,
			edgeMap: storyState.edgeMap,
		};
	});

	return Object.values(mappedResult);
}

export default function subscribeToStoriesState(hostStore: StoreApi<HostState>) {
	const storiesStore = getStoriesStore(hostStore);
	const subject = hostStore.getState().getHostSubject<'storySetups'>();
	storiesStore.subscribe((newState) => {
		subject.next({
			source: 'storySetups',
			newState: parseStoriesState(newState),
		});
	});
}
