import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getStoriesStore } from '../get-stores.util';
import { RawStorySetup } from '../../ui-types';
import subscribeToStoryState from '../state-observers/subscribe-to-story-state.command';
import { DisplayState } from '../../state-managers/display/display.state';

export function addStoryAndSubscribe(hostStore: StoreApi<HostState>, params: RawStorySetup) {
	const addStory = getStoriesStore(hostStore).getState().addStory;

	const storyStore = addStory(
		{
			id: params.id,
			title: params.title,
			script: params.script,
			resolutionNodeMap: params.resolutionNodeMap,
		},
		hostStore
	);

	subscribeToStoryState(hostStore, storyStore);
}
