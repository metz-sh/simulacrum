import { StoreApi, createStore, useStore } from 'zustand';
import { ProjectState } from './project.state';
import { FileSystemTree } from '../../common/file-system/file-sytem';
import { arrayToFileSystemTree } from '../../common/file-system/utils';
import { Settings } from '../../../settings';
import { FSItem } from '../../ui-types';

export const createProjectStore = (projectName: string, fsItems: FSItem[], version: number = 0) => {
	return _createProjectStore(
		projectName,
		arrayToFileSystemTree(fsItems, Settings.rootPath),
		version
	);
};
const _createProjectStore = (
	projectName: string,
	fileSystemTree: FileSystemTree,
	version: number = 0
) =>
	createStore<ProjectState>((set, get) => ({
		name: projectName,
		fileSystemTree,
		version,
		fileSystemSizeChangeVersion: 0,

		updateProjectFile(filePath, fileValue) {
			const { fileSystemTree } = get();
			fileSystemTree.updateFile(filePath, fileValue);

			const updatedProjectVersion = get().version + 1;

			set({ version: updatedProjectVersion });
		},

		deleteProjectFile(filePath) {
			const { fileSystemTree } = get();
			fileSystemTree.deleteFile(filePath);

			set({
				version: get().version + 1,
				fileSystemSizeChangeVersion: get().fileSystemSizeChangeVersion + 1,
			});
		},

		addProjectFile(filePath, fileValue, fileModifiers) {
			const { fileSystemTree } = get();
			fileSystemTree.addFile(filePath, fileValue);

			set({
				version: get().version + 1,
				fileSystemSizeChangeVersion: get().fileSystemSizeChangeVersion + 1,
			});
		},

		addFolder(path) {
			const { fileSystemTree } = get();
			fileSystemTree.addFolder(path);

			set({
				version: get().version + 1,
				fileSystemSizeChangeVersion: get().fileSystemSizeChangeVersion + 1,
			});
		},

		deleteFolder(path) {
			const { fileSystemTree } = get();
			fileSystemTree.deleteFolder(path);

			set({
				version: get().version + 1,
				fileSystemSizeChangeVersion: get().fileSystemSizeChangeVersion + 1,
			});
		},

		rename(path, name) {
			const { fileSystemTree } = get();
			const renamedPath = fileSystemTree.renameNode(path, name);

			set({
				version: get().version + 1,
				fileSystemSizeChangeVersion: get().fileSystemSizeChangeVersion + 1,
			});

			return renamedPath;
		},

		move(oldPath, newPath) {
			const { fileSystemTree } = get();
			fileSystemTree.moveNode(oldPath, newPath);

			set({
				version: get().version + 1,
				fileSystemSizeChangeVersion: get().fileSystemSizeChangeVersion + 1,
			});
		},
	}));

export const useProjectStore = <T>(
	store: StoreApi<ProjectState>,
	selector: (state: ProjectState) => T,
	equalityFn?: (a: T, b: T) => boolean
) => {
	return useStore(store, selector, equalityFn);
};
