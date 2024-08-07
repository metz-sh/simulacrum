import { FSItem, FileItem } from '../../ui-types';
import { type FileSystemNode, FileSystemTree } from './file-sytem';

// Function to convert an array of { path, value } objects to FileSystemTree
export function arrayToFileSystemTree(fsItems: FSItem[], rootPath: string): FileSystemTree {
	const fsTree = new FileSystemTree(rootPath);
	fsItems.forEach((item) => {
		if (item.type === 'folder') {
			fsTree.addFolder(item.path);
			return;
		}
		fsTree.addFile(item.path, item.value);
	});
	return fsTree;
}

// Function to convert a FileSystemTree back to an array of { path, value } objects
export function fileSystemTreeToArray(fsTree: FileSystemTree): FSItem[] {
	const fsItems: FSItem[] = fsTree.getLeafNodes().map((node) => {
		if (node.isFolder) {
			return { type: 'folder', path: node.fullPath };
		}
		return { type: 'file', path: node.fullPath, value: node.content || '' };
	});
	return fsItems;
}

export function getFilesFromFSTree(fsTree: FileSystemTree) {
	const files = fileSystemTreeToArray(fsTree).filter((fsi) => fsi.type === 'file') as FileItem[];
	return files;
}
