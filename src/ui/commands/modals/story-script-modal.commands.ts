import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { syncMonacoModels } from '../ide/sync-monaco-models.command';
import { StoryScriptModalState } from '../../state-managers/modals/story-script/story-script-modal.state';
import { getStoryStore } from '../get-stores.util';

export function openStoryScriptModal(hostStore: StoreApi<HostState>, storyId: string) {
	const entryPointModalStore = getStoryStore(hostStore, storyId).getState().stores
		.useStoryScriptModal;
	entryPointModalStore.getState().open();
}

export function closeStoryScriptModal(hostStore: StoreApi<HostState>, storyId: string) {
	const entryPointModalStore = getStoryStore(hostStore, storyId).getState().stores
		.useStoryScriptModal;
	entryPointModalStore.getState().close();
	syncMonacoModels(hostStore);
}
