import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getStoriesStore, getStoryStore } from '../get-stores.util';

export function setStoryTitle(
	hostStore: StoreApi<HostState>,
	params: {
		storyId: string;
		title: string;
	}
) {
	const storyStore = getStoryStore(hostStore, params.storyId);
	storyStore.getState().setTitle(params.title);

	//We are accessing stories store to propagate title change to stories-menu component
	const storiesStore = getStoriesStore(hostStore);
	storiesStore.setState({
		stories: storiesStore.getState().stories,
	});
}
