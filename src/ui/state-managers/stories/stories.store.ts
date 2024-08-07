import { create } from 'zustand';
import { StoriesState } from './stories.state';
import { createStoryStore } from '../story/story.store';

export const useStories = create<StoriesState>((set, get) => ({
	stories: {},

	addStory(params, hostStore) {
		const store = createStoryStore(
			params.id,
			params.title,
			params.script,
			hostStore,
			params.resolutionNodeMap
		);
		set({
			stories: {
				...get().stories,
				[params.id]: store,
			},
		});

		return store;
	},

	deleteStory(id) {
		const stories = get().stories;
		delete stories[id];
		set({
			stories,
		});
	},

	getStoryIdForCreation() {
		return Object.keys(get().stories).length.toString();
	},
}));
