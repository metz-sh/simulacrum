import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getStoryStore } from '../get-stores.util';
import { StoryState } from '../../state-managers/story/story.store';

export function setScript(
	hostStore: StoreApi<HostState>,
	params: {
		storyId: string;
		script: StoryState['script'];
	}
) {
	const storyStore = getStoryStore(hostStore, params.storyId);
	return storyStore.getState().setScript(params.script);
}
