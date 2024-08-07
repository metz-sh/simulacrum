import { StoreApi, UseBoundStore, createStore, useStore } from 'zustand';
import * as lodash from 'lodash';
import produce from 'immer';
import {
	Connection,
	Edge,
	EdgeChange,
	Node,
	NodeChange,
	addEdge,
	OnEdgesChange,
	OnConnect,
	applyNodeChanges,
	applyEdgeChanges,
	XYPosition,
} from 'reactflow';
import nodeManager from '../../services/node-manager';
import {
	FlowPlayerMode,
	FlowPlayerProps,
	FlowPlayerSpeed,
	FlowPlayerSpeedValues,
} from '../../models/flow-player';
import { createContext, useContext } from 'react';
import { subscribeWithSelector } from 'zustand/middleware';
import { EdgeData } from '../../components/base/edge/edge-data.model';
import { cloneDeep } from 'lodash';
import { CancelledFlow, Flow, ScheduledTask, SuspendedFlow } from '../../../runtime/runtime-types';
import { getColorThemeFromColor } from '../../commands/node/set-node-color.command';
import { Runtime } from '../../../runtime/runtime';
import {
	ClassNode,
	FolderNode,
	MethodNodeData,
	NodeData,
	NodeSignalState,
	NodeStateTimelineItem,
	NodeStyleCustomizations,
	addFlagsToNodeData,
	addStyleCustomizationsToNodeData,
	isClassNodeData,
	isFolderNodeData,
	isMethodNodeData,
} from '../../components/reactflow/models';
import { HostState } from '../host/host.state';
import { getBuild } from '../../commands/code-daemon/get-built-artifacts.command';
import { createEdgesFromNodesAndCallHierarchy } from '../../services/bootloader/create-edges';
import { getLayoutedNodes } from '../../commands/layout/get-layouted-nodes.command';
import { StoryScriptModalState } from '../modals/story-script/story-script-modal.state';
import { createStoryScriptModal } from '../modals/story-script/story-script-modal.store';

export enum StoryResolution {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
}

export type StoryState = {
	id: string;

	resolution: StoryResolution;
	setResolutionAndRefreshPrimordials: (resolution: StoryResolution) => Promise<void>;

	title: string;
	setTitle: (title: string) => void;

	runtime: Runtime;
	nodes: Node<NodeData>[];
	edges: Edge<EdgeData>[];

	reset: () => void;

	script: {
		raw: string;
		compiled: string;
	};
	setScript(params: StoryState['script']): void;

	setPrimordials: (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => void;

	loadFromMap(): void;

	flowPlayerProps: FlowPlayerProps;
	setFlowPlayerSpeed: (speed: FlowPlayerSpeed) => void;
	setFlowPlayerMode: (mode: FlowPlayerMode) => void;
	cycleFlowPlayerSpeed: () => void;
	cycleFlowPlayerMode: () => void;

	updateExecutionLog: (flow: Flow, nodeId: string, item: NodeStateTimelineItem) => void;

	isFinished: boolean;
	setIsFinished: (_: boolean) => void;

	getNode: (id: string) => Node<NodeData>;

	setNodeData: (id: string, data: Partial<NodeData>) => void;
	setNodeStyle: (id: string, style: React.CSSProperties) => void;

	setEdgeData: (id: string, data: Partial<EdgeData>) => void;

	errors: unknown[];
	setErrors: (errors: unknown[]) => void;

	onNodesChange: (changes: NodeChange[]) => void;
	onEdgesChange: OnEdgesChange;
	onConnect: OnConnect;

	getExecutionDistribution: (data: MethodNodeData) => {
		active: number;
		completed: number;
		halted: number;
	};

	renderTokens: number[];
	returnRenderToken: (token: number) => void;
	consumeRenderToken: () => number | undefined;

	getEdges: () => Edge<EdgeData>[];

	hostStore: StoreApi<HostState>;

	edgeMap: {
		[key: string]: Partial<Edge<Partial<EdgeData>>> | undefined;
	};
	resolutionNodeMap: {
		[key in keyof typeof StoryResolution]: {
			[key: string]:
				| {
						position?: {
							x: number;
							y: number;
						};
						style?: React.CSSProperties;
						iconData?: NodeStyleCustomizations['iconData'];
						backgroundColor?: string;
				  }
				| undefined;
		};
	};
	addToEdgeMap: (id: string, update: Partial<Edge<Partial<EdgeData>>>) => void;
	addToResolutionNodeMap: (
		id: string,
		resolution: StoryResolution,
		update: {
			position?: {
				x: number;
				y: number;
			};
			style?: React.CSSProperties;
			iconData?: NodeStyleCustomizations['iconData'];
			backgroundColor?: string;
		}
	) => void;
	purgeLayoutInformationFromResolutionNodeMap(): void;

	getActiveNodes: () => { id: string }[];

	runtimeEntities: {
		flows: {
			active: Flow[];
			completed: Flow[];
			cancelled: CancelledFlow[];
			suspended: SuspendedFlow[];
		};
		scheduledTasks: {
			active: ScheduledTask[];
			completed: ScheduledTask[];
		};
		tick: number;
	};

	setRuntimeEntities: (param: StoryState['runtimeEntities']) => void;

	stores: {
		useStoryScriptModal: UseBoundStore<StoreApi<StoryScriptModalState>>;
	};
};

export const createStoryStore = (
	id: string,
	title: string,
	script: StoryState['script'],
	hostStore: StoreApi<HostState>,
	resolutionNodeMap?: StoryState['resolutionNodeMap'],
	edgeMap?: StoryState['edgeMap'],
	resolution?: StoryResolution
) =>
	createStore<StoryState, [['zustand/subscribeWithSelector', never]]>(
		subscribeWithSelector<StoryState>((set, get) => ({
			id,
			title,
			handlers: {},
			runtime: new Runtime(),
			nodes: [],
			edges: [],
			flowPlayerProps: { speed: '1x', mode: 'manual' },
			isFinished: false,
			entryPointModalOpenFor: undefined,
			errors: [],
			classMemberSetup: {},
			script,
			renderTokens: [1],
			resolutionNodeMap: resolutionNodeMap || {
				[StoryResolution.HIGH]: {},
				[StoryResolution.MEDIUM]: {},
				[StoryResolution.LOW]: {},
			},
			edgeMap: edgeMap || {},
			runtimeEntities: {
				flows: {
					active: [],
					completed: [],
					cancelled: [],
					suspended: [],
				},
				scheduledTasks: {
					active: [],
					completed: [],
				},
				tick: 0,
			},
			resolution: resolution || StoryResolution.HIGH,
			hostStore,
			stores: {
				useStoryScriptModal: createStoryScriptModal(),
			},

			setNodeStyle(id, style) {
				const nodes = get().nodes.map((node) => {
					if (node.id === id) {
						node.style = {
							...node.style,
							...style,
						};
					}
					return node;
				});

				set({
					nodes,
				});
			},

			setTitle(title) {
				set({
					title,
				});
			},

			setScript(script) {
				set({
					script,
				});
			},

			setErrors(errors) {
				set({
					errors,
				});
			},

			setNodeData(id, data) {
				const nodes = get().nodes.map((node) => {
					if (node.id === id) {
						node.data = {
							...node.data,
							...data,
						} as NodeData;
					}
					return node;
				});

				set({
					nodes,
				});
			},

			setEdgeData(id, data) {
				const edges = get().edges.map((edge) => {
					if (edge.id === id) {
						edge.data = {
							...edge.data,
							...data,
						} as EdgeData;
					}
					return edge;
				});

				set({
					edges,
				});
			},

			getNode(id) {
				const nodes = get().nodes;
				const result = nodes.find((node) => node.id === id);

				if (!result) {
					throw new Error(`node with id ${id} not found!`);
				}

				return result;
			},

			reset: async () => {
				const resettedNodes = get().nodes.map((node) => {
					if (isMethodNodeData(node.data)) {
						node.data.activeExecutionLogs = [];
						node.data.completedExecutionLogs = [];
					}
					return node;
				});
				set({
					nodes: resettedNodes,
					isFinished: false,
					flowPlayerProps: { speed: '1x', mode: 'manual' },
				});
			},

			setPrimordials: (nodes: Node<NodeData>[], edges: Edge<EdgeData>[]) => {
				for (const node of nodes) {
					if (node.data.flags?.collapsed) {
						const children = nodeManager.getAllChildren(node.id, nodes);
						get().runtime.addAutoPopEffect(
							node.id,
							children.map((c) => c.id)
						);
					}
				}

				set({
					nodes,
					edges,
				});

				get().loadFromMap();
			},

			loadFromMap() {
				const { resolutionNodeMap, edgeMap, resolution } = get();
				set({
					nodes: get().nodes.map((node) => {
						const override = resolutionNodeMap[resolution][node.data.trueId];
						if (!override) {
							return node;
						}

						const propertiesToCopy: {
							position?: XYPosition;
							style?: React.CSSProperties;
						} = {};

						if (override.position) {
							propertiesToCopy.position = override.position;
						}

						if (
							override.backgroundColor &&
							node.type !== 'collapsedClassNode' &&
							node.type !== 'collapsedFolderNode'
						) {
							propertiesToCopy.style = {
								...node.style,
								...override.style,
								...getColorThemeFromColor(override.backgroundColor),
							};
						}
						if (override.iconData) {
							addStyleCustomizationsToNodeData(
								{
									iconData: override.iconData,
								},
								node.data
							);
						}
						if (override.backgroundColor) {
							addStyleCustomizationsToNodeData(
								{
									backgroundColor: override.backgroundColor,
								},
								node.data
							);
						}
						return {
							...node,
							...cloneDeep(propertiesToCopy),
						};
					}),
				});

				set({
					edges: get().edges.map((edge) => {
						const partialEdge = edgeMap[edge.data?.trueId || edge.id];
						if (!partialEdge) {
							return edge;
						}
						return {
							...edge,
							...partialEdge,
							data: {
								...edge.data,
								...partialEdge.data,
							} as EdgeData,
						};
					}),
				});
			},

			purgeLayoutInformationFromResolutionNodeMap() {
				const { resolutionNodeMap } = get();
				const resolutionsToPropagate: StoryResolution[] = [
					StoryResolution.HIGH,
					StoryResolution.MEDIUM,
					StoryResolution.LOW,
				];
				for (const resolution of resolutionsToPropagate) {
					const nodeMap = resolutionNodeMap[resolution];
					lodash.mapValues(nodeMap, (value) => {
						delete value?.position;
						delete value?.style?.width;
						delete value?.style?.height;
					});
				}

				set({
					resolutionNodeMap,
				});
			},

			setFlowPlayerSpeed: (speed: FlowPlayerSpeed) => {
				set({
					flowPlayerProps: produce(get().flowPlayerProps, (draft) => {
						draft.speed = speed;
					}),
				});
			},
			setFlowPlayerMode: (mode: FlowPlayerMode) => {
				set({
					flowPlayerProps: produce(get().flowPlayerProps, (draft) => {
						draft.mode = mode;
					}),
				});
			},
			setIsFinished: (param: boolean) => {
				if (param) {
					get().setFlowPlayerMode('manual');
				}
				set({
					isFinished: param,
				});
			},
			cycleFlowPlayerSpeed: () => {
				const currentSpeedIndex = FlowPlayerSpeedValues.findIndex(
					(value) => value === get().flowPlayerProps.speed
				);
				const nextSpeedIndex =
					currentSpeedIndex === FlowPlayerSpeedValues.length - 1
						? 0
						: currentSpeedIndex + 1;

				get().setFlowPlayerSpeed(FlowPlayerSpeedValues[nextSpeedIndex]);
			},
			cycleFlowPlayerMode: () => {
				const nextMode = get().flowPlayerProps.mode === 'auto' ? 'manual' : 'auto';
				get().setFlowPlayerMode(nextMode);
			},

			onNodesChange: (changes: NodeChange[]) => {
				set({
					nodes: applyNodeChanges(changes, get().nodes),
				});
			},

			onEdgesChange: (changes: EdgeChange[]) => {
				set({
					edges: applyEdgeChanges(changes, get().edges),
				});
			},
			onConnect: (connection: Connection) => {
				set({
					edges: addEdge(connection, get().edges),
				});
			},

			getExecutionDistribution(data) {
				return nodeManager.getExecutionDistribution(data);
			},

			updateExecutionLog(flow, nodeId, item) {
				const node = get().getNode(nodeId);
				if (!isMethodNodeData(node.data)) {
					return;
				}
				let activeExecutionLog = node.data.activeExecutionLogs.find(
					(log) => log.flow.id === flow.id
				);
				if (!activeExecutionLog) {
					activeExecutionLog = {
						flow,
						timeline: [],
					};
					node.data.activeExecutionLogs.push(activeExecutionLog);
				}

				if (item.event === NodeSignalState.SIGNAL_PARSED) {
					const activeExecutionLogIndex = node.data.activeExecutionLogs.findIndex(
						(log) => log.flow.id === flow.id
					);
					if (activeExecutionLogIndex < 0) {
						throw new Error('Execution log not found!');
					}
					const [activeExecutionLog] = node.data.activeExecutionLogs.splice(
						activeExecutionLogIndex,
						1
					);
					activeExecutionLog.timeline.push(item);
					activeExecutionLog.timeline.sort((t1, t2) => {
						const comparisonResult = t1.tick - t2.tick;
						if (comparisonResult === 0) {
							if (t1.isAutoPop && !t2.isAutoPop) {
								return -1;
							}
						}
						return comparisonResult;
					});

					node.data.completedExecutionLogs.push(activeExecutionLog);
					get().setNodeData(nodeId, {
						activeExecutionLogs: node.data.activeExecutionLogs,
						completedExecutionLogs: node.data.completedExecutionLogs,
					});
					return;
				}

				activeExecutionLog.timeline.push(item);
				activeExecutionLog.timeline.sort((t1, t2) => {
					const comparisonResult = t1.tick - t2.tick;
					if (comparisonResult === 0) {
						if (t1.isAutoPop && !t2.isAutoPop) {
							return -1;
						}
					}
					return comparisonResult;
				});
				get().setNodeData(nodeId, { activeExecutionLogs: node.data.activeExecutionLogs });
			},

			returnRenderToken(token) {
				const tokens = get().renderTokens;
				set({
					renderTokens: [...tokens, token],
				});
			},

			consumeRenderToken() {
				const token = get().renderTokens.pop();
				return token;
			},

			getEdges() {
				return get().edges;
			},

			addToEdgeMap(id, update) {
				const edgeMap = get().edgeMap;
				set({
					edgeMap: {
						...edgeMap,
						[id]: {
							...edgeMap[id],
							...update,
						},
					},
				});
			},

			addToResolutionNodeMap(id, resolution, update) {
				const nodeMap = get().resolutionNodeMap[resolution];
				const cachedNode = nodeMap[id];
				const updatedResolutionMap = {
					...get().resolutionNodeMap,
					[resolution]: {
						...nodeMap,
						[id]: {
							...cachedNode,
							...update,
						},
					},
				};
				set({
					resolutionNodeMap: updatedResolutionMap,
				});
			},

			getActiveNodes() {
				const { nodes, getExecutionDistribution } = get();
				return nodes
					.filter((node) => {
						if (!isMethodNodeData(node.data)) {
							return false;
						}
						const distribution = getExecutionDistribution(node.data);
						return distribution.active > 0;
					})
					.map((node) => ({ id: node.id }));
			},

			setRuntimeEntities(param) {
				set({
					runtimeEntities: param,
				});
			},

			async setResolutionAndRefreshPrimordials(resolution) {
				const { hostStore, id, setPrimordials, nodes: oldNodes } = get();

				const nodes = oldNodes.map((node) => {
					const flagData = (() => {
						if (isMethodNodeData(node.data)) {
							return {
								keywordFlags: node.data.keywordFlags,
								parentKeywordFlags: node.data.parentKeywordFlags,
							};
						}
						return {
							keywordFlags: node.data.keywordFlags,
						};
					})();
					if (flagData) {
						const { keywordFlags, parentKeywordFlags } = flagData;
						const { flags, hidden } = nodeManager.getDerivedValuesForNode(
							keywordFlags,
							parentKeywordFlags
						);
						node = {
							...node,
							data: {
								...node.data,
								flags,
							},
							hidden,
						};
					}
					if (isClassNodeData(node.data)) {
						if (node.data.flags?.collapsed && !node.data.flags.view) {
							node.type = 'collapsedClassNode';
						} else {
							node.type = 'classNode';
						}
					}
					if (isFolderNodeData(node.data)) {
						if (node.data.flags?.collapsed) {
							node.type = 'collapsedFolderNode';
						} else {
							node.type = 'folderNode';
						}
					}

					return node;
				});

				const nodesToCollapse = nodeManager.getNodesToCollapse(resolution, nodes);
				const {
					artificats: { callHierarchyContainer, projectVersion },
					isDifferentThanBefore,
				} = getBuild(hostStore);

				for (let node of nodesToCollapse) {
					if (isClassNodeData(node.data) && !node.data.flags?.view) {
						node.type = 'collapsedClassNode';
					}
					if (isFolderNodeData(node.data)) {
						node.type = 'collapsedFolderNode';
					}

					addFlagsToNodeData(
						{
							collapsed: true,
						},
						node.data
					);
					node = {
						...node,
						data: {
							...node.data,
						},
					} as ClassNode | FolderNode;
					const children = nodeManager.getAllChildren(node.id, nodes);
					for (let child of children) {
						addFlagsToNodeData(
							{
								delegateToParent: true,
							},
							child.data
						);
						child.hidden = true;

						child = {
							...child,
							data: {
								...child.data,
							},
						};
					}
				}

				const edges = createEdgesFromNodesAndCallHierarchy(
					id,
					nodes,
					callHierarchyContainer
				);

				const layoutedNodes = await getLayoutedNodes(hostStore, {
					atRuntime: false,
					resolution,
					projectName: `${hostStore.getState().baseProps.projectName}_${resolution}`,
					projectVersion: projectVersion,
					isBuildDifferentThanBefore: isDifferentThanBefore,
					nodes,
					edges,
				});

				set({
					resolution,
				});
				setPrimordials(layoutedNodes, edges);
			},
		}))
	);

export type StoryStore = ReturnType<typeof createStoryStore>;

export const StoryContext = createContext<ReturnType<typeof createStoryStore> | null>(null);

export const useStory = <T>(
	selector: (state: StoryState) => T,
	equalityFn?: (a: T, b: T) => boolean
) => {
	const store = useContext(StoryContext);
	if (store === null) {
		throw new Error('The component is not under FlowContext!');
	}
	return useStore(store, selector, equalityFn);
};
