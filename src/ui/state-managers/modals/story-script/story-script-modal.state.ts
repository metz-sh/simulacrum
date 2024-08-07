import { ClassMemberSetup, EntryPoint } from '../../../ui-types';

export type StoryScriptModalState = {
	isOpen: boolean;

	open(): void;
	close(): void;
};
