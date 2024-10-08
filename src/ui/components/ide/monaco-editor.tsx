import { Editor, Monaco, OnChange } from '@monaco-editor/react';
import { shallow } from 'zustand/shallow';
import { useEffect, useState } from 'react';
import { useCodeDaemon } from '../../state-managers/code-daemon/code-daemon.store';
import { useCommands } from '../../commands/use-command.hook';
import tableTemplate from '../../../std/completion-templates/table-template';
import collectionTemplate from '../../../std/completion-templates/collection-template';
import keyvalueTemplate from '../../../std/completion-templates/keyvalue-template';
import injectableTemplate from '../../../std/completion-templates/injectable-template';
import compilerOptions from '../../../compiler/compiler-options';
import ThemeSwitcher from './theme-manager/theme-switcher';
import ThemeManager from './theme-manager/theme-manager';
import useThemeStore from './theme-manager/theme.store';
import { Theme } from './theme-manager/themes/theme.interface';

export default function (props: { onChange: OnChange }) {
	const [monacoRef, setMonacoRef] = useState<Monaco>();
	const { useProject, useIDE, stores } = useCodeDaemon(
		(state) => ({ useProject: state.useProject, useIDE: state.useIDE, stores: state.stores }),
		shallow
	);
	const { fileSystemSizeChangeVersion } = useProject(
		(state) => ({
			fileSystemSizeChangeVersion: state.fileSystemSizeChangeVersion,
		}),
		shallow
	);
	const { setMonaco, setEditor, activeFilePath } = useIDE(
		(state) => ({
			activeFilePath: state.activeFilePath,
			setMonaco: state.setMonaco,
			setEditor: state.setEditor,
			editor: state.editor,
		}),
		shallow
	);

	const {
		ide: { refreshIDE, syncMonacoModels, getActiveFile },
	} = useCommands();

	// use Effect for theme control
	const { currentTheme } = useThemeStore();
	useEffect(() => {
		if (!monacoRef) return;
		ThemeManager.getAllThemes().forEach((theme) => {
			monacoRef.editor.defineTheme(theme.slug, theme.getJson() as any);
		});

		monacoRef.editor.setTheme(
			currentTheme.slug === 'dark-theme' ? 'dark-theme' : 'light-theme'
		);
	}, [monacoRef, currentTheme]);

	useEffect(() => {
		if (!monacoRef) {
			return;
		}

		// monacoRef.editor.defineTheme('darkTheme', darkTheme as any);
		// monacoRef.editor.defineTheme('lightTheme', lightTheme as any);
		// monacoRef.editor.setTheme('darkTheme');

		monacoRef.languages.typescript.typescriptDefaults.setCompilerOptions({
			...(compilerOptions as any),
			noLib: true,
		});

		setMonaco(monacoRef);
		syncMonacoModels();

		const { dispose } = monacoRef.languages.registerCompletionItemProvider('typescript', {
			provideCompletionItems(model, position, context, token) {
				const word = model.getWordUntilPosition(position);
				const range = {
					startLineNumber: position.lineNumber,
					endLineNumber: position.lineNumber,
					startColumn: word.startColumn,
					endColumn: word.endColumn,
				};
				return {
					suggestions: [
						{
							label: 'table',
							insertText: tableTemplate,
							documentation: `Creates a new class representing a relational db table`,

							kind: monacoRef.languages.CompletionItemKind.Function,
							range,
						},
						{
							label: 'collection',
							insertText: collectionTemplate,
							documentation: `Creates a new class representing a NoSQL collection`,

							kind: monacoRef.languages.CompletionItemKind.Function,
							range,
						},
						{
							label: 'keyvalue',
							insertText: keyvalueTemplate,
							documentation: `Creates a new class representing a KeyValue store`,

							kind: monacoRef.languages.CompletionItemKind.Function,
							range,
						},
						{
							label: 'service',
							insertText: injectableTemplate,
							documentation: `Creates a new class representing a Service`,

							kind: monacoRef.languages.CompletionItemKind.Function,
							range,
						},
					],
				};
			},
		});

		return dispose;
	}, [monacoRef]);

	useEffect(() => {
		syncMonacoModels();
	}, [fileSystemSizeChangeVersion]);

	useEffect(() => {
		refreshIDE();
	}, [activeFilePath]);

	const activeFile = getActiveFile();

	return (
		<>
			<ThemeSwitcher />
			<Editor
				theme="theme"
				height="100%"
				width="100%"
				language="typescript"
				value={activeFile?.content}
				path={activeFile?.fullPath || 'empty.ts'}
				options={{
					fontSize: 18,
					fontWeight: '500',
					fontFamily: 'Fira Mono',
					minimap: {
						enabled: false,
					},
					overviewRulerLanes: 0,
					lineNumbersMinChars: 2,
				}}
				beforeMount={(monaco) => {
					setMonacoRef(monaco);
				}}
				onMount={setEditor}
				onChange={props.onChange}
			/>
		</>
	);
}
