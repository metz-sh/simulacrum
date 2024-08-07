import { StoreApi, createStore, useStore } from 'zustand';
import { NotesState } from './notes.state';

export const DefaultNotesContent = `
<h1>What are we building?</h1>
<p>Something good hopefully!</p>
`;

export const createNotesStore = (content?: string) => {
	return _createNotesStore(content || DefaultNotesContent);
};
const _createNotesStore = (content: string) =>
	createStore<NotesState>((set, get) => ({
		content,
		updateContent(content) {
			set({
				content,
			});
		},
	}));

export const useNotesStore = <T>(
	store: StoreApi<NotesState>,
	selector: (state: NotesState) => T,
	equalityFn?: (a: T, b: T) => boolean
) => {
	return useStore(store, selector, equalityFn);
};
