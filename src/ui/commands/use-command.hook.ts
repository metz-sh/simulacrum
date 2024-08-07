import { useContext } from 'react';
import { HostContext } from '../state-managers/host/host.store';
import { StoreApi } from 'zustand';
import { HostState } from '../state-managers/host/host.state';
import { hydrateStoryScriptFromStore } from './stories/hydrate-raw-story.command';
import { getActiveFile } from './ide/get-active-file.command';
import { addStoryAndSubscribe } from './stories/add-story-and-subscribe.command';
import { disableIDEOverlay, enableIDEOverlay } from './ide/overlay-handlers.command';
import { addDefinitionsToMonaco } from './ide/add-definitions-to-monaco.command';
import { refreshIDE } from './ide/refresh-ide.command';
import { setEditorLocation } from './ide/set-editor-location.command';
import { syncMonacoModels } from './ide/sync-monaco-models.command';
import { addFile } from './file-management/add-file.command';
import { deleteFile } from './file-management/delete-file.command';
import { getErrorsFromMonacoWorker } from './ide/get-errors-from-monaco-worker';
import { closeStoryScriptModal, openStoryScriptModal } from './modals/story-script-modal.commands';
import { getBuiltArtifacts } from './code-daemon/get-built-artifacts.command';
import { getScript } from './stories/get-script.command';
import { addFilesToMonaco } from './ide/add-files-to-monaco.command';
import { setEdgeLabel } from './edge/set-edge-label.command';
import { setNodePosition } from './node/set-node-position.command';
import { setNodeIconData } from './node/set-node-icon-data.command';
import { addFolder } from './file-management/add-folder.command';
import { deleteFolder } from './file-management/delete-folder.command';
import { rename } from './file-management/rename.command';
import { getActiveFilePath } from './ide/get-active-file-path.command';
import { move } from './file-management/move.command';
import { initializeDisplay } from './display/intialize-display.command';
import { setStoryTitle } from './stories/set-story-title.command';
import { setScript } from './stories/set-script.command';
import { reset } from './stories/reset.command';
import { getLayoutedNodes } from './layout/get-layouted-nodes.command';
import { setNodeSize } from './node/set-node-size.command';
import { setNodeColor } from './node/set-node-color.command';
import { setErrorMarkers } from './ide/set-error-markers.command';
import { clearAllErrorMarkers } from './ide/clear-all-error-markers.command';

type CommandFunction<R, A extends any[]> = (arg1: StoreApi<HostState>, ...rest: A) => R;

function initializeForRegistration<R, A extends any[]>(
	hostStore: StoreApi<HostState>,
	fn: CommandFunction<R, A>
) {
	return fn.bind(fn, hostStore);
}

export function useCommands() {
	const hostStore = useContext(HostContext);
	if (!hostStore) {
		throw new Error('useCommands is not under Host context!');
	}

	return {
		codeDaemon: {
			getBuiltArtifacts: initializeForRegistration(hostStore, getBuiltArtifacts),
		},
		stories: {
			hydrateStoryScriptFromStore: initializeForRegistration(
				hostStore,
				hydrateStoryScriptFromStore
			),
			addStoryAndSubscribe: initializeForRegistration(hostStore, addStoryAndSubscribe),
			getScript: initializeForRegistration(hostStore, getScript),
			setScript: initializeForRegistration(hostStore, setScript),
			setStoryTitle: initializeForRegistration(hostStore, setStoryTitle),
			reset: initializeForRegistration(hostStore, reset),
		},

		layout: {
			getLayoutedNodes: initializeForRegistration(hostStore, getLayoutedNodes),
		},

		ide: {
			getActiveFilePath: initializeForRegistration(hostStore, getActiveFilePath),
			getActiveFile: initializeForRegistration(hostStore, getActiveFile),
			enableIDEOverlay: initializeForRegistration(hostStore, enableIDEOverlay),
			disableIDEOverlay: initializeForRegistration(hostStore, disableIDEOverlay),
			addDefinitionsToMonaco: initializeForRegistration(hostStore, addDefinitionsToMonaco),
			refreshIDE: initializeForRegistration(hostStore, refreshIDE),
			setEditorLocation: initializeForRegistration(hostStore, setEditorLocation),
			syncMonacoModels: initializeForRegistration(hostStore, syncMonacoModels),
			getErrorsFromMonacoWorker: initializeForRegistration(
				hostStore,
				getErrorsFromMonacoWorker
			),
			addFilesToMonaco: initializeForRegistration(hostStore, addFilesToMonaco),
			setErrorMarkers: initializeForRegistration(hostStore, setErrorMarkers),
			clearAllErrorMarkers: initializeForRegistration(hostStore, clearAllErrorMarkers),
		},

		fileManagement: {
			addFile: initializeForRegistration(hostStore, addFile),
			addFolder: initializeForRegistration(hostStore, addFolder),
			deleteFolder: initializeForRegistration(hostStore, deleteFolder),
			deleteFile: initializeForRegistration(hostStore, deleteFile),
			rename: initializeForRegistration(hostStore, rename),
			move: initializeForRegistration(hostStore, move),
		},

		modals: {
			openStoryScriptModal: initializeForRegistration(hostStore, openStoryScriptModal),
			closeStoryScriptModal: initializeForRegistration(hostStore, closeStoryScriptModal),
		},

		edge: {
			setEdgeLabel: initializeForRegistration(hostStore, setEdgeLabel),
		},

		node: {
			setNodePosition: initializeForRegistration(hostStore, setNodePosition),
			setNodeSize: initializeForRegistration(hostStore, setNodeSize),
			setNodeIconData: initializeForRegistration(hostStore, setNodeIconData),
			setNodeColor: initializeForRegistration(hostStore, setNodeColor),
		},

		display: {
			initializeDisplay: initializeForRegistration(hostStore, initializeDisplay),
		},
	};
}
