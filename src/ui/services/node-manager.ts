import { Edge, Node } from 'reactflow';
import {
	ClassNode,
	ExecutionLog,
	FolderNode,
	MethodNode,
	MethodNodeData,
	NodeData,
	NodeFlags,
	NodeSignalState,
	NodeStyleCustomizations,
	addFlagsToNodeData,
	addStyleCustomizationsToNodeData,
	isClassNodeData,
	isFolderNodeData,
} from '../components/reactflow/models';
import { Keyword } from '../../compiler/compiler-types';
import { getColorThemeFromColor } from '../commands/node/set-node-color.command';
import { StoryResolution } from '../ui-types';

class NodeManager {
	getExecutionDistribution(data: {
		activeExecutionLogs: ExecutionLog[];
		completedExecutionLogs: ExecutionLog[];
		cancelledExecutionLogs: ExecutionLog[];
	}) {
		const halted = data.activeExecutionLogs
			.map((log) => log.timeline[log.timeline.length - 1])
			.filter((item) => item?.event === NodeSignalState.HALT).length;
		return {
			active: data.activeExecutionLogs.length,
			completed: data.completedExecutionLogs.length,
			halted,
			cancelled: data.cancelledExecutionLogs.length,
		};
	}

	getDelegatedNode(node: Node<NodeData>, nodes: Node<NodeData>[]): Node<NodeData> {
		if (!node.data.flags?.delegateToParent) {
			return node;
		}

		const parentNode = nodes.find((n) => n.id === node.parentNode);
		if (!parentNode) {
			throw new Error(`Can not find parent of node(${node.id}) which needs delegation!`);
		}

		return this.getDelegatedNode(parentNode, nodes);
	}

	getAllChildren(nodeId: string, nodes: Node<NodeData>[]): Node<NodeData>[] {
		const result: Node<NodeData>[] = [];
		const children = nodes.filter((n) => n.parentNode === nodeId);

		result.push(...children, ...children.map((c) => this.getAllChildren(c.id, nodes)).flat());

		return result;
	}

	getNodeName(node: Node<NodeData>) {
		if (isFolderNodeData(node.data) || isClassNodeData(node.data)) {
			return node.data.title;
		}
		return `${node.data.className}.${node.data.methodName}`;
	}

	getNodesToCollapse(
		resolution: StoryResolution,
		nodes: Node<NodeData>[]
	): (ClassNode | FolderNode)[] {
		if (resolution === StoryResolution.HIGH) {
			return [];
		}
		if (resolution === StoryResolution.MEDIUM) {
			return nodes.filter((n) => isClassNodeData(n.data)) as ClassNode[];
		}

		return nodes.filter(
			(n) =>
				(isFolderNodeData(n.data) && !n.parentNode) ||
				(isClassNodeData(n.data) && !n.parentNode)
		) as (ClassNode | FolderNode)[];
	}

	getDerivedValuesForNode(
		keywordFlags: Keyword['flags'],
		parentKeywordFlags?: Keyword['flags']
	): {
		styleCustomizations: NodeData['styleCustomizations'];
		flags: NodeFlags;
		hidden: boolean;
	} {
		const data: {
			styleCustomizations?: NodeData['styleCustomizations'];
			flags: NodeFlags;
		} = {
			flags: {
				view: keywordFlags.view,
				delegateToParent: keywordFlags.delegateToParent,
				collapsed: keywordFlags.collapsed,
			},
		};

		const viewType = keywordFlags.view?.type;
		if (viewType === 'table') {
			addStyleCustomizationsToNodeData(
				{
					backgroundColor: '#4c6ef5',
					iconData: {
						iconString: 'logos:postgresql',
						iconColorVariant: 'dark',
					},
				},
				data
			);
		}
		if (viewType === 'collection') {
			addStyleCustomizationsToNodeData(
				{
					backgroundColor: '#12b886',
					iconData: {
						iconString: 'skill-icons:mongodb',
						iconColorVariant: 'dark',
					},
				},
				data
			);
		}
		if (viewType === 'keyvalue') {
			addStyleCustomizationsToNodeData(
				{
					backgroundColor: '#fa5252',
					iconData: {
						iconString: 'logos:redis',
						iconColorVariant: 'light',
					},
				},
				data
			);
		}

		if (parentKeywordFlags) {
			const viewType = parentKeywordFlags.view?.type;
			if (viewType) {
				addStyleCustomizationsToNodeData(
					{
						passiveColor: 'rgb(6,6,12)',
					},
					data
				);
				addFlagsToNodeData(
					{
						view: {
							type: 'simple',
						},
					},
					data
				);
			}
		}

		const hidden = keywordFlags.isHidden || !!parentKeywordFlags?.collapsed;

		return {
			styleCustomizations: data.styleCustomizations,
			flags: data.flags,
			hidden,
		};
	}

	createNodeStyle(styleCustomizations?: NodeStyleCustomizations) {
		let style: React.CSSProperties = {};
		if (styleCustomizations?.backgroundColor) {
			style = {
				...getColorThemeFromColor(styleCustomizations.backgroundColor),
			};
		}
		return style;
	}

	collectLogs(methodNodes: MethodNode[]) {
		const collectedLogs = methodNodes.reduce(
			(acc, cur) => {
				acc.activeExecutionLogs.push(...cur.data.activeExecutionLogs);
				acc.completedExecutionLogs.push(...cur.data.completedExecutionLogs);
				acc.cancelledExecutionLogs.push(...cur.data.cancelledExecutionLogs);
				return acc;
			},
			{
				activeExecutionLogs: [],
				completedExecutionLogs: [],
				cancelledExecutionLogs: [],
			} as {
				activeExecutionLogs: ExecutionLog[];
				completedExecutionLogs: ExecutionLog[];
				cancelledExecutionLogs: ExecutionLog[];
			}
		);

		return collectedLogs;
	}
}

export default new NodeManager();
