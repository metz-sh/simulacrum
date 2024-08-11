import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getStoryStore } from '../get-stores.util';
import { NodeProps } from 'reactflow';
import {
	NodeData,
	NodeStyleCustomizations,
	addStyleCustomizationsToNodeData,
} from '../../components/reactflow/models';
import { StoryResolution } from '../../ui-types';

export function setNodeIconData(
	hostStore: StoreApi<HostState>,
	storyId: string,
	node: NodeProps<NodeData>,
	iconData: NodeStyleCustomizations['iconData']
) {
	const { setNodeData, addToResolutionNodeMap } = getStoryStore(hostStore, storyId).getState();
	const data = node.data;
	addStyleCustomizationsToNodeData(
		{
			iconData,
		},
		data
	);
	setNodeData(node.id, data);
	const resolutionsToPropagate: StoryResolution[] = [
		StoryResolution.HIGH,
		StoryResolution.MEDIUM,
		StoryResolution.LOW,
	];
	for (const resolution of resolutionsToPropagate) {
		addToResolutionNodeMap(node.data.trueId, resolution, {
			iconData,
		});
	}
}
