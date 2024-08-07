import { Flow } from '../../../runtime/runtime-types';
import { KeywordFlags, ViewFlag } from '../../../compiler/compiler-types';
import { NodeProps, type Node } from 'reactflow';

export enum NodeSignalState {
	INACTIVE = 'INACTIVE',
	RECEIVED_SIGNAL = 'RECEIVED_SIGNAL',
	PARSING_SIGNAL = 'PARSING_SIGNAL',
	CALLING_DEPENDENCY = 'CALLING_DEPENDENCY',
	WAITING_FOR_DEPENDENCY = 'WAITING_FOR_DEPENDENCY',
	DEPENDENCY_RESOLVED = 'DEPENDENCY_RESOLVED',
	SENDING_SIGNAL = 'SENDING_SIGNAL',
	SIGNAL_PARSED = 'SIGNAL_PARSED',
	LOG = 'LOG',
	HALT = 'HALT',
	NO_OP = 'NO_OP',
}

export type TimelineEvents = Extract<
	NodeSignalState,
	| NodeSignalState.PARSING_SIGNAL
	| NodeSignalState.CALLING_DEPENDENCY
	| NodeSignalState.DEPENDENCY_RESOLVED
	| NodeSignalState.SENDING_SIGNAL
	| NodeSignalState.SIGNAL_PARSED
	| NodeSignalState.LOG
	| NodeSignalState.HALT
>;

export type NodeStateTimelineItem = {
	tick: number;
	event: TimelineEvents;
	isAutoPop?: boolean;
} & (
	| {
			event: NodeSignalState.PARSING_SIGNAL;
			params?: any[];
			parameters?: { name: string; type: string; text: string }[];
	  }
	| {
			event: NodeSignalState.CALLING_DEPENDENCY;
			destination: {
				id: string;
				name: string;
			};
	  }
	| {
			event: NodeSignalState.DEPENDENCY_RESOLVED;
			destination: {
				id: string;
				name: string;
			};
	  }
	| {
			event: NodeSignalState.SENDING_SIGNAL;
			destination: {
				id: string;
				name: string;
			};
	  }
	| {
			event: NodeSignalState.SIGNAL_PARSED;
			returnValue?: any;
	  }
	| {
			event: NodeSignalState.LOG;
			logs: any[];
	  }
	| {
			event: NodeSignalState.HALT;
			coveredHalts: number;
			haltedFor: number;
	  }
);

export type ExecutionLog = {
	flow: Flow;
	timeline: NodeStateTimelineItem[];
};

export type NodeType = 'method-node' | 'class-node' | 'folder-node';

export type NodeFlags = {
	view?: ViewFlag;
	delegateToParent?: boolean;
	collapsed?: boolean;
};
export type NodeStyleCustomizations = {
	iconData?: {
		iconString: string;
		iconColorVariant: 'dark' | 'light';
	};
	passiveColor?: string;
	activeColor?: string;
	backgroundColor?: string;
};

export type NodeData = {
	type: NodeType;
	trueId: string;
	title: string;

	flags?: NodeFlags;
	styleCustomizations?: NodeStyleCustomizations;
	parentNode?: string;
} & (
	| {
			type: 'folder-node';
			keywordFlags: KeywordFlags;
	  }
	| {
			type: 'method-node';
			className: string;
			methodName: string;
			signature: string;
			parameters: { name: string; type: string; text: string }[];
			returnType: string;
			argumentHash: string;
			activeExecutionLogs: ExecutionLog[];
			completedExecutionLogs: ExecutionLog[];
			cancelledExecutionLogs: ExecutionLog[];
			keywordFlags: Omit<KeywordFlags, 'isConstructorBased' | 'view'>;
			parentKeywordFlags: KeywordFlags;

			comment?: string;
	  }
	| {
			type: 'class-node';
			className: string;
			properties: {
				name: string;
				show?: boolean;
			}[];
			propertyValues: {
				[key: string]: any;
			};
			keywordFlags: KeywordFlags;

			comment?: string;
	  }
);

export type MethodNodeData = NodeData & { type: 'method-node' };
export type ClassNodeData = NodeData & { type: 'class-node' };
export type FolderNodeData = NodeData & { type: 'folder-node' };

export type MethodNode = Node<MethodNodeData>;
export type ClassNode = Node<ClassNodeData>;
export type FolderNode = Node<FolderNodeData>;

export type MethodNodeProps = NodeProps<MethodNodeData>;
export type ClassNodeProps = NodeProps<ClassNodeData>;
export type FolderNodeProps = NodeProps<FolderNodeData>;

export function addFlagsToNodeData(flags: NodeData['flags'], data: Partial<NodeData>) {
	data.flags = data.flags || {};
	data.flags = {
		...data.flags,
		...flags,
	};
}

export function addStyleCustomizationsToNodeData(
	styleCustomizations: NodeData['styleCustomizations'],
	data: Partial<NodeData>
) {
	data.styleCustomizations = data.styleCustomizations || {};
	data.styleCustomizations = {
		...data.styleCustomizations,
		...styleCustomizations,
	};
}

export function isMethodNodeData(data: NodeData): data is MethodNodeData {
	return data.type === 'method-node';
}

export function isClassNodeData(data: NodeData): data is ClassNodeData {
	return data.type === 'class-node';
}

export function isFolderNodeData(data: NodeData): data is FolderNodeData {
	return data.type === 'folder-node';
}
