import { type Position } from 'reactflow';
import { NodeFlags, NodeType } from '../../components/reactflow/models';

export type LayoutableNode = {
	id: string;
	width: number;
	height: number;

	layoutOptions?: Record<string, string>;
	children?: LayoutableNode[];
};

export type PreLayoutableNode = Omit<LayoutableNode, 'children'> & {
	type: NodeType;
	flags?: NodeFlags;
	parentNode?: string;
	propertiesToShow: boolean;
};

export type LayoutableEdge = {
	id: string;

	source: string;
	target: string;

	sourceParent?: string;
	destinationParent?: string;

	data?: {
		sourceXOffset?: number;
	};
};

export type Port = Position;
export type NodePorts = {
	sourcePorts: Port[];
	targetPorts: Port[];
};
export type EdgePorts = {
	sourcePort: Port;
	targetPort: Port;
};
