import { Box, Overlay, createStyles } from '@mantine/core';
import { FileTreeView } from './file-manager/file-tree-view';
import { useCallback, useEffect } from 'react';
import { shallow } from 'zustand/shallow';
import { useCodeDaemon } from '../../state-managers/code-daemon/code-daemon.store';
import { debounce } from 'lodash';
import StatusConsole from './status-console';
import { CodeDaemonState } from '../../state-managers/code-daemon/code-daemon-types';
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import MonacoEditor from './monaco-editor';
import BuildButton from './build-button';
import { useCommands } from '../../commands/use-command.hook';
import CursorPositionComponent from './cursor-position.component';
import NotesModalComponent from '../notes-modal/notes-modal.component';
import globalInterface from '../../state-managers/ide/globals/global-interface';
import { bannedDefinitions } from '../../../compiler/compiler-options';

function getDefinitionsOnCompile(compiledProject: Map<string, string>) {
	const libs: { content: string; filePath: string }[] = [];
	for (const entry of compiledProject.entries()) {
		const [filePath, value] = entry;
		if (filePath.endsWith('.d.ts')) {
			libs.push({
				content: value,
				filePath,
			});
		}
	}

	return libs;
}

const useStyles = createStyles((theme) => ({
	menuBar: {
		backgroundColor: '#07090B',
		display: 'flex',
		justifyContent: 'end',
		alignItems: 'center',
		padding: '10px',
		gap: '5px',
		width: '100%',
		marginTop: '4px',
		marginBottom: '15px',
	},
}));

const selector = (state: CodeDaemonState) => ({
	isCompilerServiceReady: state.isCompilerServiceReady,
	sendBuildPreviewCommand: state.sendBuildPreviewCommand,
	sendCompileCommand: state.sendCompileCommand,
	useProject: state.useProject,
	useIDE: state.useIDE,
	stores: state.stores,
	setPreview: state.setPreview,
	compiledProject: state.compiledProject,
	compiledProjectVersion: state.compiledProjectVersion,
	compilerService: state.compilerService,
});

export default function (props: { height?: string }) {
	const { classes } = useStyles();

	const {
		isCompilerServiceReady,
		sendBuildPreviewCommand,
		useProject,
		useIDE,
		compiledProject,
		compiledProjectVersion,
		setPreview,
		sendCompileCommand,
		compilerService,
		stores,
	} = useCodeDaemon(selector, shallow);

	const { version: projectVersion, updateProjectFile } = useProject(
		(state) => ({
			version: state.version,
			updateProjectFile: state.updateProjectFile,
		}),
		shallow
	);

	const {
		getActiveFilePath,
		editor,
		overlayed,
		monaco,
		globalLibraryInitialized,
		markGlobalLibraryInitialized,
	} = useIDE(
		(state) => ({
			setActiveFilePath: state.setActiveFilePath,
			getActiveFilePath: state.getActiveFilePath,
			editor: state.editor,
			overlayed: state.overlayed,
			monaco: state.monaco,
			globalLibraryInitialized: state.globalLibraryInitialized,
			markGlobalLibraryInitialized: state.markGlobalLibraryInitialized,
		}),
		shallow
	);

	const {
		ide: { getErrorsFromMonacoWorker, addFilesToMonaco, addDefinitionsToMonaco, refreshIDE },
	} = useCommands();

	async function buildPreview() {
		const errors = await getErrorsFromMonacoWorker();
		if (errors.length) {
			setPreview({
				state: 'errored',
				errors,
			});
			return;
		}
		sendBuildPreviewCommand(`preview`);
	}

	useEffect(() => {
		if (monaco._tag === 'None' || globalLibraryInitialized) {
			return;
		}

		addFilesToMonaco([
			{
				path: 'globals.d.ts',
				value: globalInterface,
			},
		]);

		markGlobalLibraryInitialized();
	}, [monaco, globalLibraryInitialized]);

	useEffect(() => {
		if (!isCompilerServiceReady) {
			return;
		}
		if (isCompilerServiceReady && !compilerService) {
			throw new Error('Signal says ready but found no compiler service!');
		}
		const libsFs = compilerService!.libsFs;
		const definitions = Array.from(libsFs, ([filePath, content]) => ({
			filePath,
			content,
		}));
		addDefinitionsToMonaco(definitions);
	}, [isCompilerServiceReady]);

	useEffect(() => {
		if (isCompilerServiceReady) {
			sendCompileCommand();
		}
	}, [isCompilerServiceReady, projectVersion]);

	useEffect(() => {
		if (compiledProjectVersion <= 0) {
			return;
		}
		const definitions = getDefinitionsOnCompile(compiledProject);
		addFilesToMonaco(definitions.map((def) => ({ path: def.filePath, value: def.content })));
		refreshIDE();
		buildPreview();
	}, [compiledProjectVersion]);

	const updateFile = debounce((filePath: string, fileValue: string) => {
		updateProjectFile(filePath, fileValue);
	}, 500);

	const onEditorValueChange = useCallback(() => {
		pipe(
			editor,
			O.map((editor) => {
				const currentActiveFilePath = getActiveFilePath();
				if (!currentActiveFilePath) {
					return;
				}
				const currentValue = editor.getValue();

				updateFile(currentActiveFilePath, currentValue);
			})
		);
	}, [editor]);

	return (
		<div style={{ height: props.height, maxHeight: props.height }}>
			<div
				style={{
					display: 'flex',
					minHeight: '100%',
					backgroundColor: '#07090B',
				}}
			>
				{overlayed && <Overlay opacity={0.9} zIndex={1} />}
				<div style={{ width: '25%', display: 'flex', flexDirection: 'column' }}>
					<FileTreeView />
					<div
						style={{
							height: '50%',
						}}
					></div>
				</div>
				<div
					style={{
						width: '75%',
						display: 'flex',
						flexDirection: 'column',
						position: 'relative',
					}}
				>
					<div className={classes.menuBar}>
						<BuildButton />
					</div>
					<MonacoEditor onChange={onEditorValueChange} />
					<Box pos={'absolute'} bottom={5} w={'100%'}>
						<CursorPositionComponent />
					</Box>
				</div>
			</div>
			<div>
				<StatusConsole />
			</div>
		</div>
	);
}
