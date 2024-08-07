import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore, getIDEStore, getStoryStore, getDisplayStore } from '../get-stores.util';
import { XYPosition, NodeProps } from 'reactflow';
import { NodeData } from '../../components/reactflow/models';
import { StoryResolution } from '../../state-managers/story/story.store';

export function setNodeSize(
	hostStore: StoreApi<HostState>,
	storyId: string,
	node: NodeProps<NodeData>,
	size: {
		width: string;
		height: string;
	}
) {
	const { addToResolutionNodeMap, resolution } = getStoryStore(hostStore, storyId).getState();
	addToResolutionNodeMap(node.data.trueId, resolution, {
		style: size,
	});
}
