import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore, getIDEStore, getStoryStore, getDisplayStore } from '../get-stores.util';
import { XYPosition, NodeProps } from 'reactflow';
import { TinyColor } from '@ctrl/tinycolor';
import { NodeData, addStyleCustomizationsToNodeData } from '../../components/reactflow/models';
import { StoryResolution } from '../../state-managers/story/story.store';

export function setNodeColor(
	hostStore: StoreApi<HostState>,
	storyId: string,
	node: NodeProps<NodeData>,
	color: string
) {
	const { addToResolutionNodeMap, setNodeStyle, setNodeData } = getStoryStore(
		hostStore,
		storyId
	).getState();
	const resolutionsToPropagate: StoryResolution[] = [
		StoryResolution.HIGH,
		StoryResolution.MEDIUM,
		StoryResolution.LOW,
	];
	for (const resolution of resolutionsToPropagate) {
		addToResolutionNodeMap(node.data.trueId, resolution, {
			backgroundColor: color,
		});
	}

	const data = node.data;
	addStyleCustomizationsToNodeData(
		{
			backgroundColor: color,
		},
		data
	);
	setNodeData(node.id, data);
	setNodeStyle(node.id, getColorThemeFromColor(color));
}

export function getColorThemeFromColor(color: string): React.CSSProperties {
	const tinyColorForBg = new TinyColor(color);
	const tinyColorForBorder = new TinyColor(color);
	const backgroundColor = tinyColorForBg.setAlpha(0.1).toRgbString();
	const borderColor = tinyColorForBorder.setAlpha(0.65).brighten(4).toRgbString();

	return {
		backgroundColor,
		borderColor,
	};
}
