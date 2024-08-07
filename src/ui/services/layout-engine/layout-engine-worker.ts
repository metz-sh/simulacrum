import ELK, { ElkNode, type LayoutOptions } from 'elkjs/lib/elk-api.js';
import { NodePorts, LayoutableEdge, LayoutableNode, Port, EdgePorts } from './layout-engine-types';
import {
	getParentMap,
	injectLayoutOptionsInContainerNodes,
	parseEdgesToMap,
	parseGraphToMap,
} from './layout-engine-utils';
const elkWorker = new Worker(new URL('elkjs/lib/elk-worker.js', import.meta.url), {
	type: 'module',
});
const elk = new ELK({
	workerFactory: () => {
		return elkWorker;
	},
});

const globalLayoutOptions: LayoutOptions = {
	'elk.algorithm': 'layered',
	'elk.direction': 'RIGHT',
	'elk.layered.spacing.nodeNodeBetweenLayers': '200',
	'elk.spacing.nodeNode': '200',
	'eclipse.elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
	// 'elk.layered.spacing.nodeNodeBetweenLayers': '100',
	// 'elk.spacing.edgeNode': '50',
	// 'spacing.edgeNodeBetweenLayers': '100',
	// 'spacing.edgeEdge': '50',
	// 'spacing.edgeEdgeBetweenLayers': '75',
	hierarchyHandling: 'INCLUDE_CHILDREN',
	'elk.layered.mergeEdges': 'true',
};

const containerPadding = '[top=120,left=100,bottom=100,right=100]';
export const containerPaddingWithShow = '[top=490,left=100,bottom=100,right=100]';

const containerLayoutOptions: LayoutOptions = {
	// 'elk.algorithm': 'layered',
	// 'elk.direction': 'RIGHT',
	'eclipse.elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
	'elk.spacing.nodeNode': '100',
	'elk.layered.spacing.nodeNodeBetweenLayers': '200',
	'elk.spacing.edgeNode': '200',
	'spacing.edgeNodeBetweenLayers': '150',
	'spacing.edgeEdge': '250',
	'spacing.edgeEdgeBetweenLayers': '100',
	'elk.padding': containerPadding,
	'elk.layered.mergeEdges': 'true',
};

//NOTE: Not creating an abstract class right now, will do based on requirements and context
class LayoutEngineWorker {
	private async createGraph(params: {
		id: string;
		nodes: LayoutableNode[];
		edges: LayoutableEdge[];
	}) {
		const graph = {
			id: params.id,
			layoutOptions: globalLayoutOptions,
			children: injectLayoutOptionsInContainerNodes(params.nodes, containerLayoutOptions),
			edges: params.edges.map((e) => ({ ...e, sources: [e.source], targets: [e.target] })),
		};
		return graph;
	}

	private moveCenterX(
		edges: LayoutableEdge[],
		parentMap: Record<string, string | undefined>,
		nodeMap: Record<string, ElkNode | undefined>
	) {
		for (const edge of edges) {
			const { source, target } = edge;
			const sourceParent = parentMap[source];
			const targetParent = parentMap[target];

			if (!sourceParent || !targetParent) {
				continue;
			}

			if (sourceParent === targetParent) {
				continue;
			}

			const sourceParentNode = nodeMap[sourceParent];
			if (!sourceParentNode) {
				continue;
			}

			if (!sourceParentNode.width || !sourceParentNode.x) {
				continue;
			}

			if (!edge.data) {
				edge.data = {};
			}

			const parentRightBorderX = sourceParentNode.x + sourceParentNode.width;

			const sourceNode = nodeMap[source]!;
			if (!sourceNode.width || !sourceNode.x) {
				continue;
			}
			const sourceNodeRightBorderX = sourceNode.x + sourceParentNode.x + sourceNode.width;

			const sourceXOffset = parentRightBorderX - sourceNodeRightBorderX;

			edge.data.sourceXOffset = sourceXOffset;
		}
	}

	private async process(graph: ElkNode, edges: LayoutableEdge[]) {
		const layoutedGraph = await elk.layout(graph);
		const nodeMap = parseGraphToMap(layoutedGraph);

		return {
			nodeMap,
			edgeMap: parseEdgesToMap(edges),
		};
	}

	public async getLayout(params: {
		id: string;
		nodes: LayoutableNode[];
		edges: LayoutableEdge[];
	}) {
		const graph = await this.createGraph(params);
		const { nodeMap, edgeMap } = await this.process(graph, params.edges);

		return {
			nodeMap,
			edgeMap,
		};
	}
}

export const layoutEngineWorker = new LayoutEngineWorker();
