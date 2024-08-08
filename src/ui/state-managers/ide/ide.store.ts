import { StoreApi, createStore, useStore } from 'zustand';
import { IDEState } from './ide.state';
import * as O from 'fp-ts/Option';
import { ProjectState } from '../project/project.state';
import { pipe } from 'fp-ts/function';
import { IPosition, IRange, editor } from 'monaco-editor';

function parseMonacoEditorOpenerCommand(
	resource: Parameters<editor.ICodeEditorOpener['openCodeEditor']>[1],
	selectionOrPosition: Parameters<editor.ICodeEditorOpener['openCodeEditor']>[2]
) {
	const path = (() => {
		const result = resource.path;
		const [firstChar, ...restOfThePath] = result;
		if (firstChar === '/') {
			return restOfThePath.join('');
		}

		return result;
	})();

	const location = selectionOrPosition
		? {
				line:
					(selectionOrPosition as IRange).startLineNumber ??
					(selectionOrPosition as IPosition).lineNumber,
				character:
					(selectionOrPosition as IRange).startColumn ??
					(selectionOrPosition as IPosition).column,
			}
		: {
				line: 0,
				character: 0,
			};

	return {
		activeFilePath: path,
		...location,
	};
}

function getIfFileExists(path: string, projectStore: StoreApi<ProjectState>) {
	return !!projectStore.getState().fileSystemTree.findFile(path);
}

export const createIDEStore = (
	projectStore: StoreApi<ProjectState>,
	initialActiveFilePath?: string
) =>
	createStore<IDEState>((set, get) => ({
		globalLibraryInitialized: false,
		activeFilePath: initialActiveFilePath,
		monaco: O.none,
		editor: O.none,

		overlayed: false,

		markGlobalLibraryInitialized() {
			set({
				globalLibraryInitialized: true,
			});
		},

		setActiveFilePath(path?: string) {
			set({
				activeFilePath: path,
			});
		},

		getActiveFilePath() {
			return get().activeFilePath;
		},

		setMonaco(monaco) {
			const { setEditorLocation } = get();
			monaco?.editor?.registerEditorOpener({
				openCodeEditor(source, resource, selectionOrPosition) {
					const parsedLocation = parseMonacoEditorOpenerCommand(
						resource,
						selectionOrPosition
					);
					const fileExists = getIfFileExists(parsedLocation.activeFilePath, projectStore);
					if (fileExists) {
						setEditorLocation(parsedLocation);
					}
					return true;
				},
			});
			set({
				monaco: O.some(monaco),
			});
		},

		setEditor(editor) {
			set({
				editor: O.some(editor),
			});
		},

		enableOverlay() {
			set({
				overlayed: true,
			});
		},

		disableOverlay() {
			set({
				overlayed: false,
			});
		},

		setEditorLocation(params) {
			const { editor, setActiveFilePath } = get();
			pipe(
				editor,
				O.map((editor) => {
					setActiveFilePath(params.activeFilePath);
					setTimeout(() => {
						editor.setPosition({ column: params.character, lineNumber: params.line });
						editor.revealPositionInCenter({
							column: params.character,
							lineNumber: params.line,
						});
					}, 10);
				})
			);
		},
	}));

export const useIDEStore = <T>(
	store: StoreApi<IDEState>,
	selector: (state: IDEState) => T,
	equalityFn?: (a: T, b: T) => boolean
) => {
	return useStore(store, selector, equalityFn);
};
