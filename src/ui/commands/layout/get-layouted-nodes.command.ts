import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore, getIDEStore, getStoryStore, getDisplayStore } from '../get-stores.util';
import { Node, Edge } from 'reactflow';
import { EdgeData } from '../../components/base/edge/edge-data.model';
import { layoutEngine } from '../../services/layout-engine/layout-engine';
import { NodeData } from '../../components/reactflow/models';
import { StoryResolution } from '../../ui-types';

export async function getLayoutedNodes(
	hostStore: StoreApi<HostState>,
	params: {
		resolution: StoryResolution;
		projectName: string;
		projectVersion: number;
		nodes: Node<NodeData>[];
		edges: Edge<EdgeData>[];
	} & (
		| {
				atRuntime: true;
		  }
		| {
				atRuntime: false;
				isBuildDifferentThanBefore: boolean;
		  }
	)
) {
	const {
		getUpdatedNodesFromMap,
		updateNodeMap,
		resolutionCachedProjectVersion,
		setCachedProjectVersion,
	} = getDisplayStore(hostStore).getState();
	const { resolution } = params;

	if (params.atRuntime) {
		const { nodes: layoutedNodes } = await layoutEngine.getLayoutedGraph(
			params.projectName,
			params.nodes,
			params.edges,
			params.resolution
		);
		updateNodeMap(resolution, layoutedNodes, params.projectVersion);
		return layoutedNodes;
	}

	const cachedProjectVersion = resolutionCachedProjectVersion[resolution];
	if (params.projectVersion === cachedProjectVersion) {
		return getUpdatedNodesFromMap(resolution, params.nodes);
	}
	if (!params.isBuildDifferentThanBefore) {
		setCachedProjectVersion(resolution, params.projectVersion);
		return getUpdatedNodesFromMap(resolution, params.nodes);
	}

	const { nodes: layoutedNodes } = await layoutEngine.getLayoutedGraph(
		params.projectName,
		params.nodes,
		params.edges,
		params.resolution
	);
	updateNodeMap(resolution, layoutedNodes, params.projectVersion);
	return layoutedNodes;
}
