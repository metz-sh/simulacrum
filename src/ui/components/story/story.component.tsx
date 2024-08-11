import ReactFlow, {
	Controls,
	Background,
	PanOnScrollMode,
	Panel,
	BackgroundVariant,
	useReactFlow,
	ReactFlowInstance,
	FitViewOptions,
	ControlButton,
	ConnectionMode,
} from 'reactflow';
import 'reactflow/dist/style.css';
import 'reactflow/dist/base.css';
import baseEdge from '../base/edge/baseEdge';
import { useFullscreen, useMediaQuery } from '@mantine/hooks';
import { LoadingOverlay, Paper, Text } from '@mantine/core';
import { nodeTypes } from '../../common/node-types';
import PlayerControls from '../player-controls/player-controls';
import { gridGap } from '../../common/sizes';
import StoryScriptModal from '../story-script-modal/story-script-modal';
import { StoryState, useStory } from '../../state-managers/story/story.store';
import StoryScriptErrorsDaemonComponent from '../story-script-errors/story-script-errors-daemon.component';
import { useContext, useEffect, useState } from 'react';
import { useCommands } from '../../commands/use-command.hook';
import { IconKeyframeAlignCenter } from '@tabler/icons-react';
import { HostContext, useHost } from '../../state-managers/host/host.store';
import { RenderEngine } from '../../services/render-engine/render-engine';
import RenderDaemonComponent from '../render-daemon/render-daemon.component';
import { getStoryStore } from '../../commands/get-stores.util';
import RenderIfAllowedComponent from '../render-if-allowed/render-if-allowed.component';
import RuntimeConsoleComponent from '../runtime-console/runtime-console.component';
import ResolutionSliderComponent from '../resolution-slider/resolution-slider.component';
import { shallow } from 'zustand/shallow';
import { PlaygroundViewFlags } from '../../ui-types';

function focus(
	reactFlowInstance: ReactFlowInstance,
	nodes: { id: string }[],
	options?: FitViewOptions
) {
	if (!reactFlowInstance.viewportInitialized) {
		return;
	}
	return reactFlowInstance.fitView({
		padding: 0.3,
		nodes,
		duration: 300,
		...options,
	});
}

const edgeTypes = {
	baseEdge: baseEdge,
};

const selector = (state: StoryState) => ({
	nodes: state.nodes,
	edges: state.edges,
	errors: state.errors,
	onNodesChange: state.onNodesChange,
	onEdgesChange: state.onEdgesChange,
	onConnect: state.onConnect,
	id: state.id,
	script: state.script,
	getActiveNodes: state.getActiveNodes,
});

function renderSmallScreeSizeAlert() {
	return (
		<Paper shadow="xs" p="sm" style={{ marginBottom: '20px' }}>
			<Text>This screen size is not ideal, but hey when life gives you lemons... </Text>
		</Paper>
	);
}

function Story(props: { namespace: string; height?: string; viewFlags?: PlaygroundViewFlags }) {
	const { toggle, fullscreen, ref } = useFullscreen();
	const isScreenSmall = useMediaQuery('(max-width: 40em)');
	const { nodes, edges, onEdgesChange, onNodesChange, onConnect, script, id, getActiveNodes } =
		useStory(selector, shallow);
	const hostStore = useContext(HostContext);
	if (!hostStore) {
		throw new Error('story component needs to be under Host context!');
	}
	const reactFlow = useReactFlow();

	const storyStore = getStoryStore(hostStore, id);
	const [renderEngine] = useState(() => new RenderEngine(hostStore, storyStore));

	useEffect(() => {
		const focusFunction = (() => {
			if (script.raw.length) {
				return () => {};
			}
			return () => {
				focus(reactFlow, []);
			};
		})();

		//Added because immediate execution didn't seem to be that reliable
		//With setTimeout it's at least on next iteration of eventloop
		//Added 10ms additionally to abosolutely guarantee the fit effect
		setTimeout(focusFunction, 100);
	}, [nodes, script]);

	const {
		node: { setNodePosition },
	} = useCommands();

	return (
		<>
			<RenderIfAllowedComponent>
				<StoryScriptModal renderEngine={renderEngine} />
				<StoryScriptErrorsDaemonComponent />
			</RenderIfAllowedComponent>

			<RenderDaemonComponent renderEngine={renderEngine} reactFlowInstance={reactFlow} />
			{/* {isScreenSmall && renderSmallScreeSizeAlert()} */}
			<div
				ref={ref}
				className={fullscreen ? 'flow_fullscreen' : 'flow'}
				style={props.height ? { height: props.height } : {}}
			>
				<ReactFlow
					nodes={nodes.filter((n) => !n.hidden)}
					edges={edges}
					proOptions={{ hideAttribution: true }}
					edgeTypes={edgeTypes}
					nodeTypes={nodeTypes}
					defaultEdgeOptions={{
						markerEnd: 'edge-circle',
						type: 'baseEdge',
					}}
					fitView={true}
					fitViewOptions={{
						padding: 0.27,
					}}
					panOnScroll
					preventScrolling
					panOnScrollMode={PanOnScrollMode.Free}
					minZoom={0}
					maxZoom={0.7}
					onNodesChange={onNodesChange}
					onNodeDragStop={(event, node) => setNodePosition(id, node, node.position)}
					onEdgesChange={onEdgesChange}
					onConnect={onConnect}
					connectionMode={ConnectionMode.Loose}
					nodeDragThreshold={10}
				>
					<Background
						id={props.namespace}
						variant={BackgroundVariant.Dots}
						size={2}
						offset={1}
						gap={gridGap}
						color="#333"
					/>
					<Controls
						showZoom={false}
						showInteractive={false}
						fitViewOptions={{
							padding: 0.27,
						}}
						position="bottom-left"
					>
						<ControlButton
							onClick={() => {
								const nodes = getActiveNodes();
								if (!nodes.length) {
									return;
								}
								focus(reactFlow, nodes, {
									padding: 1.5,
								});
							}}
							title="focus view"
						>
							<IconKeyframeAlignCenter size={'90px'} />
						</ControlButton>
					</Controls>

					<Panel position="bottom-center">
						<PlayerControls
							namespace={props.namespace}
							toggleFullscreen={toggle}
							renderEngine={renderEngine}
						/>
					</Panel>

					<Panel position="bottom-right">
						<ResolutionSliderComponent renderEngine={renderEngine} />
					</Panel>
				</ReactFlow>
			</div>
		</>
	);
}

export default Story;
