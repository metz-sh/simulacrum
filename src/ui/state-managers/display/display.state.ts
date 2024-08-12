import { Node } from 'reactflow';
import { NodeData } from '../../components/reactflow/models';
import { StoryResolution } from '../../ui-types';

export type NodeMap = {
	[key: string]:
		| {
				position?: {
					x: number;
					y: number;
				};
				style?: React.CSSProperties;
		  }
		| undefined;
};
export type DisplayState = {
	resolutionCachedProjectVersion: { [key in keyof typeof StoryResolution]: number };
	resolutionNodeMap: { [key in keyof typeof StoryResolution]: NodeMap };

	set: (params: Partial<Pick<DisplayState, 'resolutionNodeMap'>>) => void;

	getUpdatedNodesFromMap: (
		resolution: StoryResolution,
		nodes: Node<NodeData>[]
	) => Node<NodeData>[];
	updateNodeMap: (
		resolution: StoryResolution,
		nodes: Node<NodeData>[],
		projectVersion: number
	) => void;
	setCachedProjectVersion: (resolution: StoryResolution, version: number) => void;

	isLayoutCacheIncomplete: (resolution: StoryResolution, nodes: Node<NodeData>[]) => boolean;
};
