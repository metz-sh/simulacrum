import { StoreApi } from 'zustand';
import { DisplayState } from '../display/display.state';
import { StoryState, StoryStore } from '../story/story.store';
import { HostState } from '../host/host.state';
import { StoryResolution } from '../../ui-types';

export type StoriesState = {
	stories: {
		[key: string]: StoryStore;
	};

	addStory(
		params: {
			id: string;
			title: string;
			script: StoryState['script'];
			resolutionNodeMap?: DisplayState['resolutionNodeMap'];
			storyResolution?: StoryResolution;
		},
		hostStore: StoreApi<HostState>
	): StoryStore;

	deleteStory(id: string): void;

	getStoryIdForCreation: () => string;
};
