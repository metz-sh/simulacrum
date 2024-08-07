type FileSystemNodeMap = { [key: string]: FileSystemNode };

export class FileSystemNode {
	name: string;
	isFolder: boolean;
	children: FileSystemNodeMap;
	content?: string;
	fullPath: string; // Full path of the node

	constructor(
		name: string,
		isFolder: boolean = false,
		content: string | undefined = undefined,
		fullPath: string = ''
	) {
		this.name = name;
		this.isFolder = isFolder;
		this.children = {};
		this.content = content;
		this.fullPath = fullPath;
	}
}

export class FileSystemTree {
	root: FileSystemNode;
	private rootPath: string;

	constructor(rootPath: string) {
		this.rootPath = rootPath;
		this.root = new FileSystemNode(rootPath, true, undefined, this.rootPath);
	}

	getLeafNodes() {
		const nodes: FileSystemNode[] = [];

		function traverse(node: FileSystemNode) {
			const hasChildren = !!Object.keys(node.children).length;
			if (!hasChildren) {
				nodes.push(node);
				return;
			}

			Object.values(node.children).forEach((node) => traverse(node));
		}

		traverse(this.root);
		return nodes;
	}

	private normalizePath(path: string): string {
		// Add a trailing slash to rootPath for correct comparison
		const normalizedRootPath = this.rootPath.endsWith('/')
			? this.rootPath
			: this.rootPath + '/';

		// Ensure the path is relative to normalizedRootPath
		if (path.startsWith(normalizedRootPath)) {
			return path.substring(normalizedRootPath.length);
		}

		// If the path does not start with normalizedRootPath, return it as is
		return path;
	}

	addFile(path: string, content: string): void {
		// Ensure the path is relative to rootPath
		const relativePath = this.normalizePath(path);

		// Split the path and filter out any empty segments
		const pathParts = relativePath.split('/').filter(Boolean);
		let current = this.root;

		for (let i = 0; i < pathParts.length; i++) {
			const part = pathParts[i];
			const isLast = i === pathParts.length - 1;
			const fullPath = (current.fullPath === '/' ? '' : current.fullPath) + '/' + part;

			if (!current.children[part]) {
				current.children[part] = new FileSystemNode(part, !isLast, undefined, fullPath);
			}

			current = current.children[part];

			if (isLast) {
				current.content = content;
			}
		}
	}

	addFolder(path: string): void {
		path = this.normalizePath(path);
		const pathParts = path.split('/').filter(Boolean);
		let current = this.root;

		for (let i = 0; i < pathParts.length; i++) {
			const part = pathParts[i];
			const isLast = i === pathParts.length - 1;

			if (!current.children[part]) {
				const fullPath =
					current.fullPath + (current.fullPath.endsWith('/') ? '' : '/') + part;
				current.children[part] = new FileSystemNode(part, true, undefined, fullPath);
			} else if (!current.children[part].isFolder) {
				throw new Error(`A file with the same name as the folder already exists: ${part}`);
			}

			current = current.children[part];

			if (isLast) {
				current.isFolder = true;
			}
		}
	}

	deleteFile(path: string): boolean {
		// Ensure the path is relative to rootPath
		const relativePath = this.normalizePath(path);
		// Split the path and filter out any empty segments
		const pathParts = relativePath.split('/').filter(Boolean);
		if (pathParts.length === 0) return false;

		let current = this.root;
		let parent: FileSystemNode | null = null;
		let lastPart = '';

		for (const part of pathParts) {
			if (!current.children[part]) return false;
			parent = current;
			current = current.children[part];
			lastPart = part;
		}

		if (current.isFolder) return false;

		delete parent!.children[lastPart];
		return true;
	}

	deleteFolder(path: string): boolean {
		// Ensure the path is relative to rootPath
		const relativePath = this.normalizePath(path);
		// Split the path and filter out any empty segments
		const pathParts = relativePath.split('/').filter(Boolean);
		if (pathParts.length === 0) return false;

		let current = this.root;
		let parent: FileSystemNode | null = null;
		let lastPart = '';

		for (const part of pathParts) {
			if (!current.children[part]) return false;
			parent = current;
			current = current.children[part];
			lastPart = part;
		}

		if (!current.isFolder) return false;

		this._deleteAllChildren(current);
		delete parent!.children[lastPart];
		return true;
	}

	updateFile(path: string, newContent: string): boolean {
		// Ensure the path is relative to rootPath
		const relativePath = this.normalizePath(path);
		// Split the path and filter out any empty segments
		const pathParts = relativePath.split('/').filter(Boolean);
		let current = this.root;

		for (const part of pathParts) {
			if (!current.children[part]) return false;
			current = current.children[part];
		}

		if (current.isFolder) return false;

		current.content = newContent;
		return true;
	}

	findFile(path: string): FileSystemNode | undefined {
		// Ensure the path is relative to rootPath
		const relativePath = this.normalizePath(path);
		// Split the path and filter out any empty segments
		const pathParts = relativePath.split('/').filter(Boolean);

		let current = this.root;

		for (const part of pathParts) {
			if (!current.children[part]) {
				return undefined; // File not found
			}
			current = current.children[part];
		}

		if (current.isFolder) {
			return undefined; // Expecting a file, found a folder
		}

		return current;
	}

	private _deleteAllChildren(node: FileSystemNode): void {
		for (const childName in node.children) {
			const child = node.children[childName];
			if (child.isFolder) {
				this._deleteAllChildren(child);
			}
			delete node.children[childName];
		}
	}

	renameNode(oldPath: string, newName: string): string {
		oldPath = this.normalizePath(oldPath);
		const pathParts = oldPath.split('/').filter(Boolean);

		if (pathParts.length === 0) {
			throw new Error('Cannot rename root');
		}

		const nodeName = pathParts.pop()!;
		const parentPath = this.rootPath + (pathParts.length > 0 ? '/' + pathParts.join('/') : '');
		const parentNode = this.findNode(parentPath);

		if (!parentNode || !parentNode.isFolder) {
			throw new Error('Parent folder not found');
		}

		if (parentNode.children[newName]) {
			throw new Error('A node with the new name already exists in the parent folder');
		}

		const nodeToRename = parentNode.children[nodeName];
		if (!nodeToRename) {
			throw new Error('Node to rename does not exist');
		}

		// Perform the renaming
		nodeToRename.name = newName;
		const newFullPath = parentPath + '/' + newName;
		this.updateChildPaths(nodeToRename, nodeToRename.fullPath, newFullPath);
		nodeToRename.fullPath = newFullPath;

		parentNode.children[newName] = nodeToRename;
		delete parentNode.children[nodeName];

		return newFullPath; // Return the new full path
	}

	moveNode(oldPath: string, newPath: string): void {
		oldPath = this.normalizePath(oldPath);
		newPath = this.normalizePath(newPath);

		if (oldPath === newPath) {
			throw new Error('Source and destination paths are the same.');
		}

		const nodeToMove = this.findNode(oldPath);
		if (!nodeToMove) {
			throw new Error('Node to move does not exist.');
		}

		// Construct the full new path considering rootPath
		const fullNewPath = this.rootPath + (this.rootPath.endsWith('/') ? '' : '/') + newPath;

		const parentPathOfOldNode = this.getParentPath(oldPath);
		const parentNodeOfOldNode = this.findNode(parentPathOfOldNode);

		const parentPathOfNewNode = this.getParentPath(newPath);
		const parentNodeOfNewNode = this.findNode(parentPathOfNewNode);

		if (!parentNodeOfOldNode || !parentNodeOfOldNode.isFolder) {
			throw new Error('Parent of the node to move does not exist or is not a folder.');
		}

		if (!parentNodeOfNewNode || !parentNodeOfNewNode.isFolder) {
			throw new Error('New parent path does not exist or is not a folder.');
		}

		// Remove the node from its current location
		delete parentNodeOfOldNode.children[nodeToMove.name];

		// Add the node to its new location and update fullPath
		const newNodeName = newPath.substring(newPath.lastIndexOf('/') + 1);
		nodeToMove.name = newNodeName;
		nodeToMove.fullPath = fullNewPath;
		parentNodeOfNewNode.children[newNodeName] = nodeToMove;

		// Recursively update paths of children if it's a folder
		if (nodeToMove.isFolder) {
			this.updateChildPaths(nodeToMove, oldPath, newPath);
		}
	}

	// Recursively update the full paths of all child nodes
	private updateChildPaths(node: FileSystemNode, oldPath: string, newPath: string): void {
		for (const childName in node.children) {
			const child = node.children[childName];
			child.fullPath = child.fullPath.replace(oldPath, newPath);

			if (child.isFolder) {
				this.updateChildPaths(child, oldPath, newPath);
			}
		}
	}

	private findNode(path: string): FileSystemNode | null {
		path = this.normalizePath(path); // Normalize the path

		const pathParts = path.split('/').filter(Boolean);

		if (path === this.root.fullPath) {
			return this.root;
		}

		let current = this.root;

		for (const part of pathParts) {
			if (!current.children[part]) {
				return null; // Node not found
			}
			current = current.children[part];
		}

		return current;
	}

	// Helper method to add an existing node to a parent node
	private addExistingNode(parentNode: FileSystemNode, node: FileSystemNode): void {
		if (!parentNode || !parentNode.isFolder) {
			throw new Error('Parent node not found or is not a folder');
		}

		parentNode.children[node.name] = node;
	}

	private getParentPath(path: string): string {
		return path.substring(0, path.lastIndexOf('/'));
	}
}
