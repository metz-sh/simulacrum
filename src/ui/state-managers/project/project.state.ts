import { FileSystemTree } from '../../common/file-system/file-sytem';
import { FileModifiers } from '../../ui-types';

export type ProjectState = {
	name: string;
	version: number;

	// This is a proxy kept to make components reactive without observing fill fileSystemTree
	fileSystemSizeChangeVersion: number;
	fileSystemTree: FileSystemTree;

	updateProjectFile: (filePath: string, fileValue: string) => void;
	addProjectFile: (filePath: string, fileValue: string, fileModifiers?: FileModifiers) => void;
	addFolder: (path: string) => void;
	deleteFolder: (path: string) => void;
	rename: (path: string, name: string) => string;
	move: (oldPath: string, newPath: string) => void;
	deleteProjectFile: (filePath: string) => void;
};
