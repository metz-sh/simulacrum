import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore, getIDEStore, getStoryStore, getDisplayStore } from '../get-stores.util';
import { XYPosition, Node } from 'reactflow';
import { NodeData } from '../../components/reactflow/models';
import { StoryResolution } from '../../state-managers/story/story.store';

export function setNodePosition(
	hostStore: StoreApi<HostState>,
	storyId: string,
	node: Node<NodeData>,
	position: XYPosition
) {
	const { addToResolutionNodeMap, resolution } = getStoryStore(hostStore, storyId).getState();
	addToResolutionNodeMap(node.data.trueId, resolution, {
		position: {
			x: position.x.valueOf(),
			y: position.y.valueOf(),
		},
	});
}
