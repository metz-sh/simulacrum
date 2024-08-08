import * as O from 'fp-ts/Option';
import { FileModifiers } from '../../ui-types';
import { SourceCode } from '../../models/source-code';
import { Monaco } from '@monaco-editor/react';
import { editor } from 'monaco-editor';

export type IDEState = {
	activeFilePath?: string;
	setActiveFilePath: (path?: string) => void;
	getActiveFilePath: () => string | undefined;

	monaco: O.Option<Monaco>;
	editor: O.Option<editor.IStandaloneCodeEditor>;
	setMonaco: (monaco: Monaco) => void;
	setEditor: (editor: editor.IStandaloneCodeEditor) => void;

	setEditorLocation: (params: {
		activeFilePath: string;
		line: number;
		character: number;
	}) => void;

	overlayed: boolean;

	enableOverlay(): void;
	disableOverlay(): void;

	globalLibraryInitialized: boolean;
	markGlobalLibraryInitialized(): void;
};
