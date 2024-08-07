import { create } from 'zustand';
import { StoryScriptModalState } from './story-script-modal.state';

export const createStoryScriptModal = () =>
	create<StoryScriptModalState>((set, get) => ({
		isOpen: false,

		open() {
			const isAlreadyOpen = !!get().isOpen;
			if (isAlreadyOpen) {
				throw new Error('Entry Point Modal is already open!');
			}
			set({
				isOpen: true,
			});
		},

		close() {
			set({
				isOpen: false,
			});
		},
	}));
