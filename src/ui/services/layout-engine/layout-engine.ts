import { type ElkNode } from 'elkjs/lib/elk-api';
import { nodeSizes } from '../../common/sizes';
import { Node, Edge } from 'reactflow';
import { parseFlatNodeArray } from './layout-engine-utils';
import { containerPaddingWithShow, layoutEngineWorker } from './layout-engine-worker';
import {
	EdgePorts,
	LayoutableEdge,
	LayoutableNode,
	NodePorts,
	PreLayoutableNode,
} from './layout-engine-types';
import { EdgeData } from '../../components/base/edge/edge-data.model';
import { NodeData, isClassNodeData, isMethodNodeData } from '../../components/reactflow/models';
import { StoryResolution } from '../../state-managers/story/story.store';

class LayoutEngine {
	private worker = layoutEngineWorker;

	private getSize(node: Node<NodeData>) {
		if (isMethodNodeData(node.data)) {
			const storedSize = nodeSizes[node.type as 'methodNode' | 'previewMethodNode'];

			if (node.data.flags?.view?.type === 'simple') {
				return {
					width: storedSize.width,
					height: 90 + ((node.data.title?.length || 0) / 9) * 40,
				};
			}

			const extraHeight =
				(node.data.parameters?.length || 0) * 30 +
				((node.data.title?.length || 0) / 9) * 40 +
				(node.data.returnType?.length || 0) +
				(node.data.comment?.length || 0);

			return {
				width: storedSize.width,
				height: storedSize.height + extraHeight,
			};
		}

		return {
			width: -1,
			height: -1,
		};
	}

	private prepareGraph(nodes: Node<NodeData>[], resolution: StoryResolution) {
		const workableNodes = nodes.filter((_) => !_.hidden);
		const flatLayoutableNodes = workableNodes.map((node) => {
			const layoutableNode: PreLayoutableNode = {
				id: node.id,
				type: node.data.type,
				parentNode: node.parentNode,
				flags: node.data.flags,
				propertiesToShow: isClassNodeData(node.data)
					? node.data.properties?.some((p) => p.show)
					: false,
				...this.getSize(node),
			};

			if (layoutableNode.propertiesToShow && resolution != StoryResolution.LOW) {
				layoutableNode.layoutOptions = {
					'elk.padding': containerPaddingWithShow,
				};
			}

			return layoutableNode;
		});

		const phantomNodesToAdd: PreLayoutableNode[] = [];
		flatLayoutableNodes.forEach((fn) => {
			const isChildLess = !workableNodes.filter((wn) => wn.parentNode === fn.id).length;
			if (fn.type === 'method-node' || !isChildLess) {
				return;
			}
			const isCollapsed = fn.flags?.collapsed;
			const size = (() => {
				if (isCollapsed) {
					if (fn.propertiesToShow) {
						return {
							width: 300,
							height: 1,
						};
					}
					if (fn.type === 'class-node') {
						return {
							width: 300,
							height: 1,
						};
					}
					return {
						width: 400,
						height: 1,
					};
				}

				return {
					width: 300,
					height: 200,
				};
			})();
			const phantomChild = {
				id: `${fn.id}_phantom_child`,
				parentNode: fn.id,
				...size,
				type: fn.type === 'class-node' ? 'method-node' : 'class-node',
				propertiesToShow: false,
			} as const;
			phantomNodesToAdd.push(phantomChild);
		});

		const layoutableNodes = parseFlatNodeArray([...flatLayoutableNodes, ...phantomNodesToAdd]);
		return layoutableNodes;
	}

	private updateNodes(nodes: Node<NodeData>[], nodeMap: Record<string, ElkNode | undefined>) {
		for (const node of nodes) {
			const nodeLayout = nodeMap[node.id];
			if (!nodeLayout) {
				continue;
			}

			if (nodeLayout.width && nodeLayout.height) {
				node.style = {
					...node.style,
					width: `${nodeLayout.width}px`,
					height: `${nodeLayout.height}px`,
				};
			}

			if (nodeLayout.x && nodeLayout.y) {
				node.position.x = nodeLayout.x;
				node.position.y = nodeLayout.y;
			}
		}
	}

	private updateEdges(
		edges: Edge<EdgeData>[],
		edgeMap: Record<string, LayoutableEdge | undefined>
	) {
		for (const edge of edges) {
			const layoutedEdge = edgeMap[edge.id];
			edge.data = {
				...edge.data!,
				...layoutedEdge?.data,
			};
		}
	}

	async getLayoutedGraph(
		projectName: string,
		nodes: Node<NodeData>[],
		edges: Edge<EdgeData>[],
		resolution: StoryResolution
	) {
		const layoutableNodes = this.prepareGraph(nodes, resolution);
		const { nodeMap, edgeMap } = await this.worker.getLayout({
			id: projectName,
			nodes: layoutableNodes,
			edges: edges.map((edge) => ({
				...edge,
				sourceParent: edge.source,
				destinationParent: edge.target,
			})),
		});

		this.updateNodes(nodes, nodeMap);
		this.updateEdges(edges, edgeMap);

		return {
			nodes,
			edges,
		};
	}
}

export const layoutEngine = new LayoutEngine();
