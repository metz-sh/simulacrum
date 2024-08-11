import ReactFlow, {
	Background,
	PanOnScrollMode,
	BackgroundVariant,
	Node,
	ReactFlowProvider,
	Controls,
	ControlButton,
	useViewport,
	useReactFlow,
	ReactFlowInstance,
	Edge,
	ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import 'reactflow/dist/base.css';
import { useMediaQuery } from '@mantine/hooks';
import { gridGap } from '../../common/sizes';
import { previewNodeTypes } from './preview-node-types/preview-node-types';
import { IconKeyframeAlignCenter } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { CodeDaemonState } from '../../state-managers/code-daemon/code-daemon-types';
import { useCodeDaemon } from '../../state-managers/code-daemon/code-daemon.store';
import { shallow } from 'zustand/shallow';
import { EdgeData } from '../base/edge/edge-data.model';
import previewEdge from './preview-edge-types/preview-edge';
import { createEdgesFromNodesAndCallHierarchy } from '../../services/bootloader/create-edges';
import { ClassNode, MethodNode, NodeData, isClassNodeData } from '../reactflow/models';
import { layoutEngine } from '../../services/layout-engine/layout-engine';
import { prettifyName } from '../../../utils/prettify';
import { LoadingOverlay } from '@mantine/core';
import { Keywords } from '../../../compiler/compiler-types';
import { CallHierarchyContainer } from '../../../compiler/command-handlers/build-command/call-hierarchy-parser';
import { StoryResolution } from '../../ui-types';

function createPreviewMethodNode(params: {
	id: string;
	parentId: string;
	className: string;
	methodName: string;
}) {
	const { id, className, methodName, parentId } = params;
	const node: MethodNode = {
		id,
		data: {
			title: prettifyName(methodName),
			type: 'method-node',
			trueId: id,
			className,
			methodName,
			signature: '',
			parameters: [],
			returnType: '',
			argumentHash: '',
			activeExecutionLogs: [],
			completedExecutionLogs: [],
			cancelledExecutionLogs: [],
			keywordFlags: {
				isMarked: true,
			},
			parentKeywordFlags: {
				isMarked: true,
			},
			parentNode: parentId,
		},
		type: 'previewMethodNode',
		position: {
			x: -1,
			y: -1,
		},
		parentNode: parentId,
		extent: 'parent',
	};

	return node;
}

function createPreviewClassNode(params: { id: string; className: string }) {
	const { id, className } = params;
	const node: ClassNode = {
		id,
		data: {
			title: prettifyName(className),
			type: 'class-node',
			trueId: id,
			className,
			keywordFlags: {
				isMarked: true,
			},
			properties: [],
			propertyValues: {},
		},
		type: 'previewClassNode',
		position: {
			x: -1,
			y: -1,
		},
	};

	return node;
}

async function createPreviewPrimordials(
	keywords: Keywords,
	callHierarchyContainer: CallHierarchyContainer
) {
	let nodes: Node<NodeData>[] = [];
	keywords
		.filter((kw) => kw.flags.isMarked)
		.forEach((kw) => {
			const classId = `preview_${kw.className}`;
			nodes.push(
				createPreviewClassNode({
					id: classId,
					className: kw.className,
				})
			);

			kw.methods
				.filter((kw) => kw.flags.isMarked)
				.forEach((mkw) => {
					const methodId = `preview_${kw.className}_${mkw.methodName}`;
					nodes.push(
						createPreviewMethodNode({
							id: methodId,
							parentId: classId,
							className: kw.className,
							methodName: mkw.methodName,
						})
					);
				});
		});

	const edges = createEdgesFromNodesAndCallHierarchy(
		'preview',
		nodes,
		callHierarchyContainer
	).map((e) => ({
		...e,
		id: `preview_${e.id}`,
		type: 'previewEdge',
		animated: true,
	}));

	const { nodes: layoutedNodes } = await layoutEngine.getLayoutedGraph(
		'preview',
		nodes,
		edges,
		StoryResolution.HIGH
	);
	return {
		nodes: layoutedNodes,
		edges,
	};
}

const edgeTypes = {
	previewEdge,
};

function focus(reactFlowInstance: ReactFlowInstance, nodes: { id: string }[]) {
	return reactFlowInstance.fitView({
		padding: 0.3,
		nodes,
		duration: 300,
	});
}

function PreviewFlow(props: {
	nodes: Node[];
	edges: Edge[];
	focusNodes: { id: string }[];
	size: string;
}) {
	const isScreenSmall = useMediaQuery('(max-width: 40em)');
	const reactFlowInstance = useReactFlow();

	useEffect(() => {
		//Added because immediate execution didn't seem to be that reliable
		//With setTimeout it's at least on next iteration of eventloop
		//Added 10ms additionally to abosolutely guarantee the fit effect
		setTimeout(() => {
			focus(reactFlowInstance, props.focusNodes);
		}, 10);
	}, [props.focusNodes, props.size]);

	return (
		<div className="flow" style={{ height: props.size, width: props.size }}>
			<ReactFlow
				nodes={props.nodes}
				edges={props.edges}
				edgeTypes={edgeTypes}
				defaultEdgeOptions={{
					markerStart: 'edge-circle',
					markerEnd: 'edge-circle',
					type: 'previewEdge',
				}}
				proOptions={{ hideAttribution: true }}
				nodeTypes={previewNodeTypes}
				fitView={true}
				panOnScroll={true}
				preventScrolling={isScreenSmall}
				panOnScrollMode={PanOnScrollMode.Free}
				zoomOnPinch={true}
				minZoom={0}
				fitViewOptions={{
					padding: 1,
					nodes: props.focusNodes,
				}}
				connectionMode={ConnectionMode.Loose}
			>
				<Background
					id={`preview_bg`}
					variant={BackgroundVariant.Dots}
					size={2}
					offset={1}
					gap={gridGap}
					color="#222"
				/>
				<Controls showZoom={false} showInteractive={false}>
					<ControlButton
						onClick={() => {
							focus(reactFlowInstance, props.focusNodes);
						}}
						title="focus view"
					>
						<IconKeyframeAlignCenter size={'90px'} />
					</ControlButton>
				</Controls>
			</ReactFlow>
		</div>
	);
}

export default function PreviewFlowProvider(props: {
	preview: CodeDaemonState['preview'] & { state: 'built' };
}) {
	const {
		preview: {
			artificats: { callHierarchyContainer, keywords },
		},
	} = props;

	const [primordials, setPrimordials] = useState<{ nodes: Node<NodeData>[]; edges: Edge[] }>();
	const { useIDE } = useCodeDaemon(
		(state) => ({
			useIDE: state.useIDE,
		}),
		shallow
	);
	const activeFilePath = useIDE((state) => state.activeFilePath);

	useEffect(() => {
		createPreviewPrimordials(keywords, callHierarchyContainer).then((primordials) => {
			setPrimordials(primordials);
		});
	}, [keywords, callHierarchyContainer]);

	if (!primordials) {
		return (
			<LoadingOverlay
				loaderProps={{ size: 'md', color: 'white', variant: 'oval' }}
				visible
				overlayBlur={2}
				overlayColor="rgb(6,6,12)"
			/>
		);
	}

	const focusNodes = (() => {
		if (!activeFilePath) {
			return [];
		}

		const relevantClasses = keywords
			.filter((kw) => kw.filePath === activeFilePath)
			.map((kw) => kw.className);
		const focusNodes = primordials.nodes.filter((node) => {
			if (!isClassNodeData(node.data)) {
				return false;
			}

			return relevantClasses.includes(node.data.className);
		});

		return focusNodes;
	})();

	return (
		<ReactFlowProvider>
			<PreviewFlow
				nodes={primordials.nodes}
				edges={primordials.edges}
				focusNodes={focusNodes}
				size="100%"
			/>
		</ReactFlowProvider>
	);
}
