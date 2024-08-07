import { Node, Edge } from 'reactflow';
import { EdgeData } from '../../components/base/edge/edge-data.model';
import nodeManager from '../node-manager';
import { MethodNode, NodeData, isMethodNodeData } from '../../components/reactflow/models';
import { CallHierarchyContainer } from '../../../compiler/command-handlers/build-command/call-hierarchy-parser';

export function createEdgesFromNodesAndCallHierarchy(
	namespace: string,
	nodes: Node<NodeData>[],
	callHierarchyContainer: CallHierarchyContainer
) {
	const connectableNodes = nodes.filter((node) => isMethodNodeData(node.data)) as MethodNode[];
	const edges: Edge<EdgeData>[] = [];

	for (let index = 0; index < callHierarchyContainer.length; index++) {
		const callHierarchy = callHierarchyContainer[index];
		const { source, destination } = callHierarchy;
		const sourceNodes = connectableNodes.filter(
			(node) =>
				node.data.className! === source.className &&
				node.data.methodName! === source.methodName
		);
		const destinationNodes = connectableNodes.filter(
			(node) =>
				node.data.className! === destination.className &&
				node.data.methodName! === destination.methodName
		);
		for (let rawSourceNode of sourceNodes) {
			const originalSourceNode = rawSourceNode;
			const sourceNode = nodeManager.getDelegatedNode(rawSourceNode, nodes);
			for (let rawDestinationNode of destinationNodes) {
				if (
					rawDestinationNode.data.className === rawSourceNode.data.className &&
					rawDestinationNode.parentNode !== rawSourceNode.parentNode
				) {
					continue;
				}
				const originalDestinatinNode = rawDestinationNode;
				const destinationNode = nodeManager.getDelegatedNode(rawDestinationNode, nodes);

				if (sourceNode.id === destinationNode.id) {
					continue;
				}

				const edgeId = `${namespace}_${originalSourceNode.id}_${originalDestinatinNode.id}`;
				const edge = {
					id: edgeId,
					source: sourceNode.id,
					target: destinationNode.id,
					type: 'baseEdge',
					data: {
						sourceXOffset: -1,
						trueId: edgeId,
					},
				};
				edges.push(edge);
			}
		}
	}

	return edges;
}
