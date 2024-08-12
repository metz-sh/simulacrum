import { create } from 'zustand';
import { Node } from 'reactflow';
import { DisplayState, NodeMap } from './display.state';
import { NodeData } from '../../components/reactflow/models';
import * as lodash from 'lodash';
import { StoryResolution } from '../../ui-types';

export const useDisplay = create<DisplayState>((set, get) => ({
	resolutionCachedProjectVersion: {
		[StoryResolution.HIGH]: -1,
		[StoryResolution.MEDIUM]: -1,
		[StoryResolution.LOW]: -1,
	},
	resolutionNodeMap: {
		[StoryResolution.HIGH]: {},
		[StoryResolution.MEDIUM]: {},
		[StoryResolution.LOW]: {},
	},

	set(params) {
		set({
			resolutionNodeMap: params.resolutionNodeMap || get().resolutionNodeMap,
		});
	},

	getUpdatedNodesFromMap(resolution, nodes): Node<NodeData>[] {
		const updatedNodes: Node<NodeData>[] = [];
		const nodeMap = get().resolutionNodeMap[resolution];
		for (const node of nodes) {
			let cachedNode = nodeMap[node.data.trueId];
			if (!cachedNode) {
				updatedNodes.push(node);
				continue;
			}
			updatedNodes.push({
				...node,
				...cachedNode,
				data: node.data,
			});
		}

		return updatedNodes;
	},

	updateNodeMap(resolution, nodes, projectVersion) {
		const nodeMap = get().resolutionNodeMap[resolution];
		const updatedMap = nodes.reduce((acc, cur) => {
			const existingNode = nodeMap[cur.data.trueId];
			acc[cur.data.trueId] = {
				...existingNode,
				position: lodash.cloneDeep(cur.position),
				style: lodash.cloneDeep(cur.style),
			};
			return acc;
		}, {} as NodeMap);
		const resolutionCachedProjectVersion = {
			...get().resolutionCachedProjectVersion,
			[resolution]: projectVersion,
		};
		const resolutionNodeMap = {
			...get().resolutionNodeMap,
			[resolution]: updatedMap,
		};
		set({
			resolutionNodeMap,
			resolutionCachedProjectVersion,
		});
	},

	setCachedProjectVersion(resolution, version) {
		const resolutionCachedProjectVersion = {
			...get().resolutionCachedProjectVersion,
			[resolution]: version,
		};
		set({
			resolutionCachedProjectVersion,
		});
	},

	isLayoutCacheIncomplete(resolution, nodes) {
		const nodeMap = get().resolutionNodeMap[resolution];
		const anyNodeMissing = nodes.find((node) => !nodeMap[node.id]);

		return !!anyNodeMissing;
	},
}));
