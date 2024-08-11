import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getStoriesStore } from '../get-stores.util';
import { PlaygroundViewFlags, RawStorySetup, StoryResolution } from '../../ui-types';
import subscribeToStoryState from '../state-observers/subscribe-to-story-state.command';

function parseResolution(
	rawResolution: PlaygroundViewFlags['resolution']
): StoryResolution | undefined {
	if (!rawResolution) {
		return;
	}

	switch (rawResolution) {
		case 'low':
			return StoryResolution.LOW;
		case 'medium':
			return StoryResolution.MEDIUM;
		case 'high':
			return StoryResolution.HIGH;
	}
}

export function addStoryAndSubscribe(
	hostStore: StoreApi<HostState>,
	params: RawStorySetup & { viewFlags?: PlaygroundViewFlags }
) {
	const addStory = getStoriesStore(hostStore).getState().addStory;

	const storyStore = addStory(
		{
			id: params.id,
			title: params.title,
			script: params.script,
			resolutionNodeMap: params.resolutionNodeMap,
			storyResolution: parseResolution(params.viewFlags?.resolution),
		},
		hostStore
	);

	subscribeToStoryState(hostStore, storyStore);
}
