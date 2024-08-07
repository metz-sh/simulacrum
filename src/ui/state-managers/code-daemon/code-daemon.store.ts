import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { createContext, useContext } from 'react';
import { StateCreator, StoreApi, createStore, useStore } from 'zustand';
import { SourceCode } from '../../models/source-code';
import { CodeDaemonState, OnCodeDameonUpdated } from './code-daemon-types';
import { createProjectStore, useProjectStore } from '../project/project.store';
import { ProjectState } from '../project/project.state';
import { createIDEStore, useIDEStore } from '../ide/ide.store';
import { subscribeWithSelector } from 'zustand/middleware';
import { fileSystemTreeToArray, getFilesFromFSTree } from '../../common/file-system/utils';
import { createNotesStore, useNotesStore } from '../notes/notes.store';
import { IDEState } from '../ide/ide.state';
import { Settings } from '../../../settings';
import * as objectHash from 'object-hash';
import { FSItem } from '../../ui-types';
import { CompilerService } from '../../../compiler/compiler.service';

function getFSMapFromFiles(files: SourceCode[]) {
	const map = new Map<string, string>();
	for (const iterator of files) {
		map.set(iterator.path, iterator.value);
	}
	return map;
}

function getDefinitionsFromMonaco(ideStore: StoreApi<IDEState>): SourceCode[] {
	const optionalMonaco = ideStore.getState().monaco;
	return pipe(
		optionalMonaco,
		O.map((monaco) => {
			const definitionModels = monaco.editor
				.getModels()
				.filter((model) => model.uri.toString().endsWith('.d.ts'));
			return definitionModels.map((model) => {
				const fileName = decodeURI(model.uri.toString().split('file:///')[1]);
				return {
					path: `${Settings.rootPath}/${fileName}`,
					value: model.getValue(),
				};
			});
		}),
		O.getOrElse(() => [] as SourceCode[])
	);
}

export const createCodeDaemonStore = (
	projectName: string,
	fsItems: FSItem[],
	entryFilePath?: string,
	notesContent?: string
) =>
	createStore<CodeDaemonState, [['zustand/subscribeWithSelector', never]]>(
		subscribeWithSelector<CodeDaemonState>((set, get) => ({
			projectName,
			isCompilerServiceReady: false,

			compiledProject: new Map<string, string>(),
			compiledProjectVersion: 0,
			entryFilePath,

			stores: (() => {
				const projectStore = createProjectStore(projectName, fsItems);
				return {
					projectStore,
					ideStore: createIDEStore(projectStore, entryFilePath),
					notesStore: createNotesStore(notesContent),
				};
			})(),

			build: {
				state: 'uninitiated',
			},
			preview: {
				state: 'uninitiated',
			},

			setPreview(preview) {
				set({
					preview,
				});
			},

			setCompilerService(compilerService: CompilerService) {
				set({ compilerService, isCompilerServiceReady: true });
			},

			getCompilerService() {
				const { compilerService } = get();
				if (!compilerService) {
					throw new Error('Compiler service is not initialized yet!');
				}

				return compilerService;
			},

			sendCompileCommand() {
				const definitionFiles = getDefinitionsFromMonaco(get().stores.ideStore);
				const { fileSystemTree } = get().stores.projectStore.getState();
				const files = [...getFilesFromFSTree(fileSystemTree), ...definitionFiles];
				const fsMap = getFSMapFromFiles(files);
				const compilerService = get().getCompilerService();
				compilerService.sendCompileCommand(fsMap);
			},

			sendBuildCommand() {
				const definitionFiles = getDefinitionsFromMonaco(get().stores.ideStore);
				const { fileSystemTree, version } = get().stores.projectStore.getState();
				const files = [...getFilesFromFSTree(fileSystemTree), ...definitionFiles];
				const fsMap = getFSMapFromFiles(files);
				const compilerService = get().getCompilerService();
				compilerService.sendBuildCommand(fsMap, version);
				set({
					build: {
						state: 'processing',
					},
				});
			},

			sendBuildPreviewCommand(projectName?: string) {
				const definitionFiles = getDefinitionsFromMonaco(get().stores.ideStore);
				const { fileSystemTree, version } = get().stores.projectStore.getState();
				const files = [...getFilesFromFSTree(fileSystemTree), ...definitionFiles];
				const fsMap = getFSMapFromFiles(files);
				const compilerService = get().getCompilerService();
				compilerService.sendBuildPreviewCommand(fsMap, version, projectName);
			},

			setBuildAsErrored(errors) {
				set({
					build: {
						state: 'errored',
						errors,
					},
				});
			},

			setBuild(build) {
				set({
					build,
				});
				if (build.state === 'built') {
					set({
						lastSuccessfulBuild: build,
					});
				}
			},

			useProject<T>(
				selector: (state: ProjectState) => T,
				equalityFn?: (a: T, b: T) => boolean
			) {
				return useProjectStore(get().stores.projectStore, selector, equalityFn);
			},

			useIDE(selector, equalityFn) {
				return useIDEStore(get().stores.ideStore, selector, equalityFn);
			},

			useNotes(selector, equalityFn) {
				return useNotesStore(get().stores.notesStore, selector, equalityFn);
			},

			getIfBuildIsDifferentThanBefore(newBuild) {
				const lastSuccessfulBuild = get().lastSuccessfulBuild;
				if (!lastSuccessfulBuild) {
					return true;
				}
				const oldHash = objectHash.MD5({
					keywords: lastSuccessfulBuild.artificats.keywords,
					callHierarchyContainer: lastSuccessfulBuild.artificats.keywords,
				});
				const newHash = objectHash.MD5({
					keywords: newBuild.artificats.keywords,
					callHierarchyContainer: newBuild.artificats.keywords,
				});
				return oldHash !== newHash;
			},
		}))
	);

export type CodeDaemonStore = ReturnType<typeof createCodeDaemonStore>;

export const CodeDaemonContext = createContext<ReturnType<typeof createCodeDaemonStore> | null>(
	null
);

export const useCodeDaemon = <T>(
	selector: (state: CodeDaemonState) => T,
	equalityFn?: (a: T, b: T) => boolean
) => {
	const store = useContext(CodeDaemonContext);
	if (store === null) {
		throw new Error('The component is not under CodeDaemonContext!');
	}
	return useStore(store, selector, equalityFn);
};
