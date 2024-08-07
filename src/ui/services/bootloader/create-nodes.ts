import {
	ClassNode,
	ClassNodeData,
	FolderNode,
	FolderNodeData,
	MethodNode,
	MethodNodeData,
	NodeData,
	NodeSignalState,
} from '../../components/reactflow/models';
import { Heap } from '../../../runtime/heap';
import { Settings } from '../../../settings';
import nodeManager from '../node-manager';
import { Keyword, Keywords } from '../../../compiler/compiler-types';
import * as lodash from 'lodash';
import { Node } from 'reactflow';
import {
	createNodeIdForFolder,
	createNodeIdForClass,
	createNodeIdForMethod,
} from '../../../compiler/command-handlers/utils/create-node-id';

export function createNodesFromHeap(params: {
	namespace: string;
	keywords: Keywords;
	heap: Heap;
	initHandlers: {
		onClassNode: (address: string, node: ClassNode) => void;
		onMethodNode: (address: string, node: MethodNode) => void;
	};
}) {
	const {
		namespace,
		keywords,
		heap,
		initHandlers: { onClassNode, onMethodNode },
	} = params;

	const keywordsToNodesParser = new KeywordsToNodeParser(namespace);
	const keywordMap = lodash.keyBy(keywords, 'className');
	const heapMembers = heap.list();

	const nodesForFolders = keywordsToNodesParser.getNodesForFolders(keywords);
	const nodes: Node<NodeData>[] = [...nodesForFolders];

	for (const heapMember of heapMembers) {
		const { methods: methodKeywords, ...classKeyword } =
			keywordMap[heapMember.instance.constructor.name];
		const classNode = keywordsToNodesParser.parseClassNode(classKeyword, heapMember.address);
		if (!classNode) {
			continue;
		}
		onClassNode(heapMember.address, classNode);

		const methodNodes = methodKeywords
			.map((keyword) => {
				const parsedNode = keywordsToNodesParser.parseMethodNode(
					classKeyword,
					keyword,
					heapMember.address,
					keyword.methodName
				);
				if (parsedNode) {
					onMethodNode(heapMember.address, parsedNode);
				}
				return parsedNode;
			})
			.filter((_) => !!_) as MethodNode[];
		if (!methodNodes.length) {
			continue;
		}

		nodes.push(...[classNode, ...methodNodes]);
	}

	return nodes;
}

export class KeywordsToNodeParser {
	constructor(private readonly namespace: string) {}

	parseClassNode(keyword: Omit<Keyword, 'methods'>, address: string): ClassNode | undefined {
		if (!keyword.flags.isMarked) {
			return;
		}

		const parentPath = (() => {
			const parent = keyword.filePath.substring(0, keyword.filePath.lastIndexOf('/'));
			if (!parent) {
				return undefined;
			}
			return this.removeRootPath(parent, Settings.rootPath);
		})();

		const parentNodeId = parentPath
			? createNodeIdForFolder(parentPath, this.namespace)
			: undefined;
		const { styleCustomizations, flags, hidden } = nodeManager.getDerivedValuesForNode(
			keyword.flags
		);
		return {
			id: createNodeIdForClass(address, this.namespace),
			position: {
				x: -1,
				y: -1,
			},
			type: 'classNode',
			data: {
				type: 'class-node',
				trueId: createNodeIdForClass(address),
				title: keyword.className,
				signalState: NodeSignalState.INACTIVE,
				comment: keyword.comment,
				className: keyword.className,
				properties: keyword.properties,
				propertyValues: {},
				flags,
				keywordFlags: keyword.flags,
				styleCustomizations,
				parentNode: parentNodeId,
			} as ClassNodeData,
			parentNode: parentNodeId,
			extent: parentNodeId ? 'parent' : undefined,
			hidden,
			style: nodeManager.createNodeStyle(styleCustomizations),
		};
	}

	parseMethodNode(
		classKeyword: Omit<Keyword, 'methods'>,
		methodKeyword: Keywords[0]['methods'][0],
		address: string,
		offset: string
	): MethodNode | undefined {
		if (!methodKeyword.flags.isMarked) {
			return;
		}
		const { styleCustomizations, flags, hidden } = nodeManager.getDerivedValuesForNode(
			methodKeyword.flags,
			classKeyword.flags
		);
		return {
			id: createNodeIdForMethod(address, offset, this.namespace),
			position: {
				x: -1,
				y: -1,
			},
			type: 'methodNode',
			data: {
				type: 'method-node',
				trueId: createNodeIdForMethod(address, offset),
				title: methodKeyword.methodName,
				signalState: NodeSignalState.INACTIVE,
				activeExecutionLogs: [],
				completedExecutionLogs: [],
				cancelledExecutionLogs: [],
				signature: methodKeyword.signature,
				parameters: methodKeyword.parameters,
				returnType: methodKeyword.returnType,
				comment: methodKeyword.comment,
				className: classKeyword.className,
				methodName: methodKeyword.methodName,
				argumentHash: methodKeyword.argumentHash,
				flags,
				keywordFlags: methodKeyword.flags,
				parentKeywordFlags: classKeyword.flags,
				parentNode: createNodeIdForClass(address, this.namespace),
				styleCustomizations,
			} as MethodNodeData,
			parentNode: createNodeIdForClass(address, this.namespace),
			extent: 'parent',
			hidden,
			style: nodeManager.createNodeStyle(styleCustomizations),
		};
	}

	private getNodesForFolderPath(path: string): FolderNode[] {
		const pathParts = path.split('/');
		return pathParts.map((part, index) => {
			const fullPath = (() => {
				if (index === 0) {
					return part;
				}
				return pathParts.filter((_, i) => i <= index).join('/');
			})();

			const parentPath = (() => {
				const parent = fullPath.substring(0, fullPath.lastIndexOf('/'));
				if (!parent) {
					return undefined;
				}
				return parent;
			})();

			const containerNode: FolderNode = {
				id: createNodeIdForFolder(fullPath, this.namespace),
				position: {
					x: -1,
					y: -1,
				},
				type: 'folderNode',
				data: {
					type: 'folder-node',
					trueId: createNodeIdForFolder(fullPath),
					title: part,
					signalState: NodeSignalState.INACTIVE,
					parentNode: parentPath
						? createNodeIdForFolder(parentPath, this.namespace)
						: undefined,
					keywordFlags: {
						isMarked: true,
					},
				} as FolderNodeData,
				parentNode: parentPath
					? createNodeIdForFolder(parentPath, this.namespace)
					: undefined,
				extent: parentPath ? 'parent' : undefined,
			};

			return containerNode;
		});
	}

	private removeRootPath(path: string, rootPath: string): string | undefined {
		if (path === rootPath) {
			return;
		}
		// Add a trailing slash to rootPath for correct comparison
		const normalizedRootPath = rootPath.endsWith('/') ? rootPath : rootPath + '/';

		// Ensure the path is relative to normalizedRootPath
		if (path.startsWith(normalizedRootPath)) {
			return path.substring(normalizedRootPath.length);
		}

		// If the path does not start with normalizedRootPath, return it as is
		return path;
	}

	getNodesForFolders(keywords: Keywords) {
		const folderPaths = keywords
			.map((kw) => kw.filePath.substring(0, kw.filePath.lastIndexOf('/')))
			.map((path) => this.removeRootPath(path, Settings.rootPath))
			.filter((_) => !!_) as string[];
		const folderPathSet = new Set(folderPaths);

		const nodeMap: { [key: string]: FolderNode } = {};

		Array.from(folderPathSet)
			.map(this.getNodesForFolderPath.bind(this))
			.flat()
			.forEach((node) => {
				nodeMap[node.id] = node;
			});

		return Object.values(nodeMap);
	}
}
