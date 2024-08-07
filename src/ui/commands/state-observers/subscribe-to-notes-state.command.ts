import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getNotesStore, getProjectStore, getStoriesStore } from '../get-stores.util';
import { StoryStore } from '../../state-managers/story/story.store';
import { shallow } from 'zustand/shallow';
import { parseStoriesState } from './subscribe-to-stories-state.command';

export default function subscribeToNotesState(hostStore: StoreApi<HostState>) {
	const subject = hostStore.getState().getHostSubject<'notes'>();
	const notesStore = getNotesStore(hostStore);
	notesStore.subscribe((state) => {
		subject.next({
			source: 'notes',
			newState: {
				notesContent: state.content,
			},
		});
	});
}
