import { type ElkNode } from 'elkjs';
import { LayoutableEdge, LayoutableNode } from './layout-engine-types';
import * as lodash from 'lodash';

export function injectLayoutOptionsInContainerNodes(
	nodes: LayoutableNode[],
	layoutOptions: Record<string, string>
): LayoutableNode[] {
	return nodes.map((node) => {
		if (node.children) {
			node.layoutOptions = {
				...layoutOptions,
				...node.layoutOptions,
			};
			node.children = injectLayoutOptionsInContainerNodes(node.children, layoutOptions);
		}

		return node;
	});
}

export function parseFlatNodeArray(
	nodes: (LayoutableNode & { parentNode?: string })[]
): LayoutableNode[] {
	const groupedNodes = lodash.groupBy(nodes, 'parentNode');

	function buildNodeHierarchy(node: LayoutableNode): void {
		const children = groupedNodes[node.id];
		if (children) {
			node.children = children;
			for (const child of children) {
				buildNodeHierarchy(child); // Recursive call for each child
			}
		}
	}

	const parentNodes = groupedNodes['undefined'] || [];
	parentNodes.forEach(buildNodeHierarchy);

	return parentNodes;
}

export function parseGraphToMap(
	graph: ElkNode,
	result: Record<string, ElkNode | undefined> = {}
): Record<string, ElkNode | undefined> {
	const { children, ...nodeData } = graph;
	result[graph.id] = nodeData;

	if (!children) {
		return result;
	}

	for (const node of children) {
		parseGraphToMap(node, result);
	}

	return result;
}

//Assumes unique id
export function parseEdgesToMap(edges: LayoutableEdge[]) {
	const map: Record<string, LayoutableEdge> = {};
	for (const edge of edges) {
		map[edge.id] = edge;
	}

	return map;
}

export function getParentMap(graph: ElkNode) {
	const map: Record<string, string | undefined> = {};

	function buildParentMap(parent: ElkNode) {
		const children = parent.children;
		if (!children) {
			return;
		}

		for (const child of children) {
			map[child.id] = parent.id;
			buildParentMap(child); // Recursive call for each child
		}
	}

	if (graph.children) {
		for (const child of graph.children) {
			buildParentMap(child);
		}
	}

	return map;
}
