import { FitViewOptions, Node, ReactFlowInstance } from 'reactflow';
import anime from 'animejs';
import {
	CancelledFlow,
	Flow,
	TickResponseCodes,
	TickResponses,
	TickResult,
	TickResultContainer,
} from '../../../runtime/runtime-types';
import { SignalPacketManager } from './signal-packet-manager';
import { Address, createLocationFromAddress } from '../../../runtime/heap';
import { createStandardLibrary } from '../../../std/std';
import { getBuiltArtifacts } from '../../commands/code-daemon/get-built-artifacts.command';
import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { StoryState } from '../../state-managers/story/story.store';
import { KeywordsToNodeParser } from '../bootloader/create-nodes';
import { createEdgesFromNodesAndCallHierarchy } from '../bootloader/create-edges';
import nodeManager from '../node-manager';
import { Runtime } from '../../../runtime/runtime';
import {
	ClassNode,
	FolderNode,
	MethodNode,
	MethodNodeData,
	NodeData,
	NodeSignalState,
	NodeStateTimelineItem,
	isClassNodeData,
	isMethodNodeData,
} from '../../components/reactflow/models';
import { getLayoutedNodes } from '../../commands/layout/get-layouted-nodes.command';
import { getProjectStore } from '../../commands/get-stores.util';
import { noop } from 'lodash';
import { StoryResolution } from '../../ui-types';

export class RenderEngine {
	private signalPacketManager: SignalPacketManager;
	private keywordToNodeParser: KeywordsToNodeParser;
	private runtime: Runtime;
	private projectName: string;
	constructor(
		private hostStore: StoreApi<HostState>,
		private storyStore: StoreApi<StoryState>
	) {
		this.runtime = this.storyStore.getState().runtime;
		this.projectName = this.hostStore.getState().baseProps.projectName;
		this.keywordToNodeParser = new KeywordsToNodeParser(this.getStoryState().id);
		this.signalPacketManager = new SignalPacketManager(this.getStoryState().id);
	}

	focus(reactFlow: ReactFlowInstance, nodes: { id: string }[], options?: FitViewOptions) {
		if (!reactFlow.viewportInitialized) {
			return;
		}
		return reactFlow.fitView({
			padding: 0.3,
			nodes,
			duration: 300,
			...options,
		});
	}

	private getStoryState() {
		return this.storyStore.getState();
	}

	private getProjectVersion() {
		return getProjectStore(this.hostStore).getState().version;
	}

	async render(token: number) {
		if (token > 1) {
			throw new Error(`Invalid token number! ${token}`);
		}
		const __runtime = this.runtime;
		const std = createStandardLibrary(this.runtime, this.projectName);
		noop(__runtime, std);

		const { tickResults, setupInstructions } = await this.runtime.tick();
		await this.addUnsyncedAddressesFromHeapToStory();
		this.syncInstancePropertyValuesToStory();

		const storedResultContainers = this.runtime.getStoredResultsFromAutoPop();
		this.catchupAutoPop(storedResultContainers);

		const setupTickResults = setupInstructions.map((si) => si.tickResult);
		await Promise.all(setupTickResults.map((tickResult) => this.processTick(tickResult)));

		const processedResult = await Promise.all(
			tickResults.map((tickResult) => this.processTick(tickResult))
		);
		this.getStoryState().setRuntimeEntities(this.runtime.entities());

		const collectedActiveNodesIds = processedResult
			.map((result) => result?.activeNodeIds)
			.flat()
			.map((id) => ({ id }));

		if (this.runtime.isFinished()) {
			this.getStoryState().setIsFinished(true);
		}

		return {
			activeNodeIds: collectedActiveNodesIds,
			token,
		};
	}

	private consumeTickResult(tickResult: TickResult & { type: 'yielded' }) {
		for (const responseToCatchup of tickResult.tickResponses) {
			const accessibleLocation = createLocationFromAddress(responseToCatchup.address);
			const nodeId = this.runtime.getHeap().translateAddress(accessibleLocation);

			const parsed = this.parseTickResponseToTimelineItem(responseToCatchup);

			this.getStoryState().updateExecutionLog(tickResult.flow, nodeId, parsed.item);
		}
	}

	private catchupAutoPop(containers: TickResultContainer[]) {
		for (const resultContainer of containers) {
			resultContainer.setupInstructions.forEach((si) => {
				if (si.tickResult.type !== 'yielded') {
					return;
				}
				this.consumeTickResult(si.tickResult);
			});
			resultContainer.tickResults.forEach((tr) => {
				if (tr.type !== 'yielded') {
					return;
				}
				this.consumeTickResult(tr);
			});
		}
	}

	setResolution(resolution: StoryResolution, reactFlow: ReactFlowInstance) {
		const storedResultContainers = this.runtime.resetAutoPop();
		this.catchupAutoPop(storedResultContainers);

		this.getStoryState().setResolutionAndRefreshPrimordials(resolution);

		setTimeout(async () => {
			const nodeWork = this.getStoryState()
				.nodes.filter((node) => {
					if (!isMethodNodeData(node.data)) {
						return false;
					}
					const distribution = nodeManager.getExecutionDistribution(node.data);
					return distribution.active > 0;
				})
				.map((node) => {
					const nodeDom = document.getElementById(node.id);
					return anime({
						targets: nodeDom,
						backgroundColor: this.getNodeColor(node.id).active,
						easing: 'linear',
						duration: 0,
					}).finished;
				});
			await Promise.all(nodeWork);

			this.focus(
				reactFlow,
				this.getStoryState().nodes.filter((n) => !n.hidden)
			);
		}, 10);
	}

	private syncInstancePropertyValuesToStory() {
		for (const { instance, address } of this.runtime.getHeap().list()) {
			const nodeId = this.runtime.getHeap().translateAddress(address);
			const node = this.getStoryState().getNode(nodeId);

			if (isClassNodeData(node.data)) {
				const propertyValues = node.data.properties.reduce(
					(acc, cur) => {
						acc[cur.name] = (instance as any)[cur.name];
						return acc;
					},
					{} as Record<string, any>
				);
				this.getStoryState().setNodeData(nodeId, { propertyValues });
			}
		}
	}

	private async addUnsyncedAddressesFromHeapToStory() {
		const instances = this.runtime.getHeap().list();
		const unsyncedAddresses = instances.filter(
			(instance) => !this.runtime.getHeap().canTranslateAddress(instance.address)
		);
		const allCurrentNodes = this.storyStore.getState().nodes;
		const currentResolution = this.storyStore.getState().resolution;

		const { keywords, callHierarchyContainer } = getBuiltArtifacts(this.hostStore);

		const nodesToAdd = unsyncedAddresses
			.map(({ instance, address }) => {
				const keyword = keywords.find((kw) => kw.className === instance.constructor.name);
				if (!keyword) {
					throw new Error(`No keyword for instance! ${instance.constructor.name}`);
				}

				const diffedNodes: Node<NodeData>[] = [];

				const classNode = this.keywordToNodeParser.parseClassNode(keyword, address);
				if (classNode) {
					diffedNodes.push(classNode);
					this.runtime.getHeap().setAddressTranslation(address, classNode.id);
				}
				const methodNodes = keyword.methods
					.map((method) => {
						const parsedNode = this.keywordToNodeParser.parseMethodNode(
							keyword,
							method,
							address,
							method.methodName
						);
						if (parsedNode) {
							this.runtime.getHeap().setAddressTranslation(
								createLocationFromAddress({
									startingAddress: address,
									offset: method.methodName,
								}),
								parsedNode.id
							);
						}
						return parsedNode;
					})
					.filter((_) => !!_) as Node<NodeData>[];
				diffedNodes.push(...methodNodes);

				return diffedNodes;
			})
			.flat();

		const nodes = [...allCurrentNodes, ...nodesToAdd];

		const nodeIdsToCollapse = nodeManager
			.getNodesToCollapse(currentResolution, nodes)
			.map((n) => n.id);
		const newNodesToCollapse = nodesToAdd.filter((n) => nodeIdsToCollapse.includes(n.id)) as (
			| ClassNode
			| FolderNode
		)[];

		for (let node of newNodesToCollapse) {
			nodeManager.collapseNode(node, nodes);
		}

		if (nodesToAdd.length) {
			const edges = createEdgesFromNodesAndCallHierarchy(
				this.getStoryState().id,
				nodes,
				callHierarchyContainer
			);

			const layoutedNodes = await getLayoutedNodes(this.hostStore, {
				atRuntime: true,
				resolution: this.getStoryState().resolution,
				projectName: this.projectName,
				projectVersion: this.getProjectVersion(),
				nodes,
				edges,
			});
			this.storyStore.getState().purgeLayoutInformationFromResolutionNodeMap();
			this.storyStore.getState().setPrimordials(layoutedNodes, edges);
		}
	}

	async reset(token: number) {
		const resets = await this.resetActiveConnections(() => true);

		const nodeWork = this.getStoryState()
			.nodes.filter((node) => {
				if (!isMethodNodeData(node.data)) {
					return false;
				}
				const distribution = nodeManager.getExecutionDistribution(node.data);
				return distribution.active > 0;
			})
			.map((node) => {
				const sourceNode = document.getElementById(node.id);
				return anime({
					targets: sourceNode,
					backgroundColor: this.getNodeColor(node.id).passive,
					easing: 'linear',
					duration: 100,
				}).finished;
			});

		await Promise.all(nodeWork);

		resets.forEach(({ edgeId }) => {
			const htmlReversePath = document.getElementById(
				`${edgeId}_reverse`
			) as unknown as SVGGraphicsElement;
			const htmlPath = document.getElementById(`${edgeId}`) as unknown as SVGGraphicsElement;

			htmlReversePath.classList.remove('active', 'was_active');
			htmlPath.classList.remove('active', 'was_active');
		});

		this.getStoryState().returnRenderToken(token);
	}

	private async processTick(tickResult: TickResult) {
		const autoPopped = tickResult.autoPopped;
		if (autoPopped && autoPopped.tickResponses) {
			for (const responseToCatchup of autoPopped.tickResponses) {
				const accessibleLocation = createLocationFromAddress(responseToCatchup.address);
				const nodeId = this.runtime.getHeap().translateAddress(accessibleLocation);

				const parsed = await this.parseTickResponseToTimelineItem(responseToCatchup);

				this.getStoryState().updateExecutionLog(autoPopped.flow, nodeId, parsed.item);
			}
		}

		if (tickResult.type === 'yielded') {
			return this.processYieledTickresult(tickResult);
		}
		return this.processConstructedTickResult(tickResult);
	}

	private async processYieledTickresult(tickResult: TickResult & { type: 'yielded' }) {
		const activeNodeIds: string[] = [];

		await this.renderTickResponses(tickResult.flow, tickResult.tickResponses);

		return {
			activeNodeIds,
		};
	}

	private processConstructedTickResult(tickResult: TickResult & { type: 'constructed' }) {
		tickResult.cancelledFlows?.forEach((flow) => this.cancelFlow(flow));
	}

	private resetActiveConnections(
		filterPredicate: (params: { flowId: string; edgeId: string; packetId: string }) => boolean
	) {
		const activeConnections = this.signalPacketManager
			.getActiveConnections()
			.filter(filterPredicate);
		const resets = activeConnections.map(async ({ flowId, edgeId, packetId }) => {
			const htmlPath = document.getElementById(`${edgeId}`) as unknown as SVGGraphicsElement;
			const htmlReversePath = document.getElementById(
				`${edgeId}_reverse`
			) as unknown as SVGGraphicsElement;

			if (!htmlPath || !htmlReversePath) {
				throw new Error(`No dom element for edge: ${edgeId}`);
			}

			const path = anime.path(htmlReversePath);
			const packetDom = document.getElementById(packetId);
			if (!packetDom) {
				throw new Error(`No packet dom element for edge: ${edgeId} & ${packetId}`);
			}
			const edge = this.getStoryState()
				.getEdges()
				.find((edge) => edge.id === edgeId);
			if (!edge) {
				throw new Error(`Unable to find edge: ${edgeId}}`);
			}

			await anime
				.timeline({
					targets: packetDom,
					loop: false,
					begin: () => {
						htmlPath.classList.remove('was_active');
						htmlReversePath.classList.remove('was_active');
					},
					complete: () => {
						htmlReversePath.classList.remove('active');
						htmlPath.classList.remove('active');

						htmlPath.classList.add('was_active');
						htmlReversePath.classList.add('was_active');
					},
				})
				.add({
					translateX: path('x'),
					translateY: path('y'),
					easing: 'linear',
					duration: 300,
				})
				.add({
					opacity: 0,
					duration: 50,
				}).finished;

			this.signalPacketManager.release(flowId, edgeId, packetId);

			return {
				flowId,
				edgeId,
				packetId,
			};
		});

		return Promise.all(resets);
	}

	private async cancelFlow(cancelledFlow: CancelledFlow) {
		this.getStoryState().nodes.forEach((node) => {
			if (!isMethodNodeData(node.data)) {
				return;
			}
			const data: MethodNodeData = node.data;
			const cancellableExecutionLogIds = data.activeExecutionLogs
				.map((l, index) =>
					l.flow.id === cancelledFlow.id ? { node, index } : { node, index: -1 }
				)
				.filter(({ index }) => index >= 0);
			cancellableExecutionLogIds.forEach(({ node, index }) => {
				data.cancelledExecutionLogs.push(data.activeExecutionLogs[index]);
				data.activeExecutionLogs.splice(index, 1);

				this.renderNodePassive(node.id);
			});

			this.getStoryState().setNodeData(node.id, data);
		});

		await this.resetActiveConnections(({ flowId }) => cancelledFlow.id === flowId);

		/*
			We are now figuring out if there's a signal which was depending on this cancelled flow.
			If there's let's try to reset it.
		*/

		//The caller which led to the cancellation, can serve as the source
		const sourceAddress = cancelledFlow.callerAddress;

		//The flowStack of cancelledFlow can reveal the destination through the first element(root) on its stack
		const destinationAddress = cancelledFlow.flowStack.stack.getRoot()?.address;

		if (!sourceAddress || !destinationAddress) {
			return;
		}

		const sourceNodeId = this.runtime
			.getHeap()
			.translateAddress(createLocationFromAddress(sourceAddress));
		const destinationNodeId = this.runtime
			.getHeap()
			.translateAddress(createLocationFromAddress(destinationAddress));
		const edge = this.getStoryState().edges.find(
			(e) => e.source === sourceNodeId && e.target === destinationNodeId
		);

		if (!edge) {
			return;
		}

		await this.resetActiveConnections(
			({ flowId, edgeId }) => edgeId === edge.id && flowId === cancelledFlow.parentFlow.id
		);
	}

	private async renderTickResponses(flow: Flow, tickResponses: TickResponses[]) {
		for (const tickResponse of tickResponses) {
			const accessibleLocation = createLocationFromAddress(tickResponse.address);
			const nodeId = this.runtime.getHeap().translateAddress(accessibleLocation);

			const parsed = this.parseTickResponseToTimelineItem(tickResponse);
			this.getStoryState().updateExecutionLog(flow, nodeId, parsed.item);

			await this.renderStateChange(flow, parsed.nodeIdToRender, parsed.item);
		}
	}

	private getDelegatedNode(address: Address) {
		const nodeId = this.runtime.getHeap().translateAddress(createLocationFromAddress(address));
		let node = this.getStoryState().getNode(nodeId);
		node = nodeManager.getDelegatedNode(node, this.getStoryState().nodes);

		return node;
	}

	private parseTickResponseToTimelineItem(tickResponse: TickResponses): {
		nodeIdToRender: string;
		item: NodeStateTimelineItem;
	} {
		const accessibleLocation = createLocationFromAddress(tickResponse.address);
		const nodeId = this.runtime.getHeap().translateAddress(accessibleLocation);
		const node = this.getStoryState().getNode(nodeId) as MethodNode;
		if (tickResponse.code === TickResponseCodes.LOAD) {
			return {
				nodeIdToRender: nodeId,
				item: {
					tick: tickResponse.tick,
					isAutoPop: tickResponse.isAutoPop,
					event: NodeSignalState.PARSING_SIGNAL,
					params: tickResponse.params,
					parameters: node.data.parameters,
				},
			};
		}
		if (tickResponse.code === TickResponseCodes.SEND_DATA) {
			const sourceNodeId = this.getDelegatedNode(tickResponse.source).id;
			const destinationNode = this.getDelegatedNode(tickResponse.destination);
			const destination = {
				id: destinationNode.id,
				name: nodeManager.getNodeName(destinationNode),
			};
			return {
				nodeIdToRender: sourceNodeId,
				item: {
					tick: tickResponse.tick,
					isAutoPop: tickResponse.isAutoPop,
					event: NodeSignalState.SENDING_SIGNAL,
					destination,
				},
			};
		}
		if (tickResponse.code === TickResponseCodes.CALL_DEPENDENCY) {
			const sourceNodeId = this.getDelegatedNode(tickResponse.source).id;
			const destinationNode = this.getDelegatedNode(tickResponse.destination);
			const destination = {
				id: destinationNode.id,
				name: nodeManager.getNodeName(destinationNode),
			};
			return {
				nodeIdToRender: sourceNodeId,
				item: {
					tick: tickResponse.tick,
					isAutoPop: tickResponse.isAutoPop,
					event: NodeSignalState.CALLING_DEPENDENCY,
					destination,
				},
			};
		}
		if (tickResponse.code === TickResponseCodes.RESOLVE_DEPENDENCY) {
			const sourceNodeId = this.getDelegatedNode(tickResponse.source).id;
			const destinationNode = this.getDelegatedNode(tickResponse.destination);
			const destination = {
				id: destinationNode.id,
				name: nodeManager.getNodeName(destinationNode),
			};

			return {
				nodeIdToRender: sourceNodeId,
				item: {
					tick: tickResponse.tick,
					isAutoPop: tickResponse.isAutoPop,
					event: NodeSignalState.DEPENDENCY_RESOLVED,
					destination,
				},
			};
		}
		if (tickResponse.code === TickResponseCodes.LOG) {
			return {
				nodeIdToRender: nodeId,
				item: {
					tick: tickResponse.tick,
					isAutoPop: tickResponse.isAutoPop,
					event: NodeSignalState.LOG,
					logs: tickResponse.logs,
				},
			};
		}

		if (tickResponse.code === TickResponseCodes.HALT) {
			return {
				nodeIdToRender: nodeId,
				item: {
					tick: tickResponse.tick,
					isAutoPop: tickResponse.isAutoPop,
					event: NodeSignalState.HALT,
					coveredHalts: tickResponse.coveredHalts,
					haltedFor: tickResponse.haltedFor,
				},
			};
		}

		return {
			nodeIdToRender: nodeId,
			item: {
				tick: tickResponse.tick,
				event: NodeSignalState.SIGNAL_PARSED,
				returnValue: tickResponse.returnValue,
			},
		};
	}

	private getNodeColor(nodeId: string) {
		const node = this.getStoryState().getNode(nodeId);
		return {
			passive: node.data.styleCustomizations?.passiveColor || '#060516',
			active: node.data.styleCustomizations?.activeColor || '#2621a1',
		};
	}

	private renderNode(nodeId: string, kind: 'active' | 'passive') {
		const nodeDom = document.getElementById(nodeId);
		return anime({
			targets: nodeDom,
			backgroundColor: this.getNodeColor(nodeId)[kind],
			easing: 'linear',
			duration: 200,
		}).finished;
	}

	private renderNodeActive(nodeId: string) {
		return this.renderNode(nodeId, 'active');
	}
	private renderNodePassive(nodeId: string) {
		return this.renderNode(nodeId, 'passive');
	}

	private async renderStateChange(flow: Flow, nodeId: string, item: NodeStateTimelineItem) {
		if (item.event === NodeSignalState.HALT) {
			await new Promise((resolve) => setTimeout(resolve, 500));
		}
		if (item.event === NodeSignalState.PARSING_SIGNAL) {
			return this.renderNodeActive(nodeId);
		}
		if (item.event === NodeSignalState.SIGNAL_PARSED) {
			return this.renderNodePassive(nodeId);
		}
		if (item.event === NodeSignalState.SENDING_SIGNAL) {
			const edges = this.getStoryState().getEdges();
			const sourceNodeId = nodeId;
			const destinationNodeId = item.destination.id;

			const edge = edges.find(
				(edge) => edge.source === sourceNodeId && edge.target === destinationNodeId
			);
			if (!edge) {
				throw new Error(
					`Could not find edge between ${sourceNodeId} and ${destinationNodeId}`
				);
			}

			const edgePathDom = document.getElementById(edge.id);
			if (!edgePathDom) {
				throw new Error(`No dom element for edge: ${edge.id}`);
			}

			const path = anime.path(edgePathDom);
			const htmlPath = document.getElementById(`${edge.id}`) as unknown as SVGGraphicsElement;
			const htmlReversePath = document.getElementById(
				`${edge.id}_reverse`
			) as unknown as SVGGraphicsElement;

			const packetId = this.signalPacketManager.acquire(flow.id, edge.id);
			const packetDom = document.getElementById(packetId);
			if (!packetDom) {
				throw new Error(`No packet dom element for edge: ${edge.id} & ${packetId}`);
			}
			return anime
				.timeline({
					targets: packetDom,
					loop: false,
					begin: () => {
						htmlPath.classList.remove('was_active');
						htmlReversePath.classList.remove('was_active');
					},
					complete: () => {
						htmlPath.classList.remove('active');
						htmlReversePath.classList.remove('active');

						htmlPath.classList.add('was_active');
						htmlReversePath.classList.add('was_active');

						this.signalPacketManager.release(flow.id, edge.id, packetId);
					},
				})
				.add({
					opacity: 1,
					duration: 0,
					complete: () => {
						htmlPath.classList.add('active');
						htmlReversePath.classList.add('active');
					},
				})
				.add({
					translateX: path('x'),
					translateY: path('y'),
					easing: 'linear',
					duration: 1000,
				})
				.add({
					opacity: 0,
					duration: 50,
				}).finished;
		}
		if (item.event === NodeSignalState.CALLING_DEPENDENCY) {
			const edges = this.getStoryState().getEdges();
			const sourceNodeId = nodeId;
			const destinationNodeId = item.destination.id;

			const edge = edges.find(
				(edge) => edge.source === sourceNodeId && edge.target === destinationNodeId
			);
			if (!edge) {
				throw new Error(
					`Could not find edge between ${sourceNodeId} and ${destinationNodeId}`
				);
			}

			const edgePathDom = document.getElementById(edge.id);
			if (!edgePathDom) {
				throw new Error(`No dom element for edge: ${edge.id}`);
			}

			const path = anime.path(edgePathDom);
			const htmlPath = document.getElementById(`${edge.id}`) as unknown as SVGGraphicsElement;
			const htmlReversePath = document.getElementById(
				`${edge.id}_reverse`
			) as unknown as SVGGraphicsElement;

			const packetId = this.signalPacketManager.acquire(flow.id, edge.id);
			const packetDom = document.getElementById(packetId);
			if (!packetDom) {
				throw new Error(`No packet dom element for edge: ${edge.id} & ${packetId}`);
			}
			return anime
				.timeline({
					targets: packetDom,
					loop: false,
					begin: () => {
						htmlPath.classList.remove('was_active');
						htmlReversePath.classList.remove('was_active');
					},
				})
				.add({
					opacity: 1,
					duration: 0,
					'border-radius': 0,
					complete: () => {
						htmlPath.classList.add('active');
						htmlReversePath.classList.add('active');
					},
				})
				.add({
					translateX: path('x'),
					translateY: path('y'),
					easing: 'linear',
					duration: 1000,
				}).finished;
		}
		if (item.event === NodeSignalState.DEPENDENCY_RESOLVED) {
			const edges = this.getStoryState().getEdges();
			const sourceNodeId = nodeId;
			const destinationNodeId = item.destination.id;

			const edge = edges.find(
				(edge) => edge.source === sourceNodeId && edge.target === destinationNodeId
			);
			if (!edge) {
				throw new Error(
					`Could not find edge between ${sourceNodeId} and ${destinationNodeId}`
				);
			}

			const edgePathDom = document.getElementById(`${edge.id}_reverse`);
			if (!edgePathDom) {
				throw new Error(`No dom element for edge: ${edge.id}`);
			}

			const path = anime.path(edgePathDom);
			const htmlPath = document.getElementById(`${edge.id}`) as unknown as SVGGraphicsElement;
			const htmlReversePath = document.getElementById(
				`${edge.id}_reverse`
			) as unknown as SVGGraphicsElement;

			const packetId = this.signalPacketManager.acquire(flow.id, edge.id);
			const packetDom = document.getElementById(packetId);
			if (!packetDom) {
				throw new Error(`No packet dom element for edge: ${edge.id} & ${packetId}`);
			}
			return anime
				.timeline({
					targets: packetDom,
					loop: false,
					begin: () => {
						htmlPath.classList.remove('was_active');
						htmlReversePath.classList.remove('was_active');
					},
					complete: () => {
						htmlReversePath.classList.remove('active');
						htmlPath.classList.remove('active');

						htmlPath.classList.add('was_active');
						htmlReversePath.classList.add('was_active');

						this.signalPacketManager.release(flow.id, edge.id, packetId);
					},
				})
				.add({
					translateX: path('x'),
					translateY: path('y'),
					easing: 'linear',
					duration: 1000,
				})
				.add({
					opacity: 0,
					duration: 50,
				}).finished;
		}
	}
}
