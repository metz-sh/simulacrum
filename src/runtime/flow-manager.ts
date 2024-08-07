import * as lodash from 'lodash';
import { ExecuteStackOperationNames, ExecutionStack } from './execution-stack';
import {
	AwaitFlowInstruction,
	AwaitResolvingStrategy,
	CancelledFlow,
	CompletedAwaitFlowInstruction,
	CompletedFlow,
	Flow,
	FlowCompletionListener,
	FlowStack,
	GeneratorRecipe,
	MethodRuntimeContext,
	RuntimeGenerator,
	SuspendedFlow,
} from './runtime-types';
import { type Address } from './heap';

export class FlowManager {
	private sequenceNumber = 0;
	private completedflows = new Map<string, CompletedFlow>();
	private cancelledFlows = new Map<string, CancelledFlow>();
	private flowStackGenMap = new Map<string, FlowStack>();
	private suspendedFlowStackGenMap = new Map<string, SuspendedFlow>();
	private awaitFlowInstructions = new Map<string, AwaitFlowInstruction>();
	private completedAwaitFlowInstructions = new Map<string, CompletedAwaitFlowInstruction>();

	getAwaitFlowInstruction(params: { suspendedFlowId: string }) {
		return this.awaitFlowInstructions.get(params.suspendedFlowId);
	}

	getCompletedAwaitFlowInstruction(params: { flowId: string }) {
		return this.completedAwaitFlowInstructions.get(params.flowId);
	}

	get(id: string) {
		return this.flowStackGenMap.get(id);
	}

	getSuspended(id: string) {
		return this.suspendedFlowStackGenMap.get(id);
	}

	createFlow(params: Omit<Flow, 'id'>, generatorRecipe: GeneratorRecipe, spawnedAt: number) {
		const id = (++this.sequenceNumber).toString();
		const flow: Flow = {
			id,
			...params,
		};
		const { target, generatorFactory, factoryParams } = generatorRecipe;
		const generator = generatorFactory.bind(target)(...factoryParams, { flowId: flow.id });
		this.flowStackGenMap.set(id, { generator, stack: new ExecutionStack(), flow, spawnedAt });

		return flow;
	}

	markFlowComplete(params: {
		flowId: string;
		completedAt: number;
		lastAddress: Address;
		returnValue: any;
	}) {
		const { flowId, completedAt, lastAddress, returnValue } = params;

		const value = this.flowStackGenMap.get(flowId);
		if (!value) {
			throw new Error(`Can't delete flow. Flow not found: ${flowId}`);
		}
		this.flowStackGenMap.delete(flowId);
		this.completedflows.set(flowId, {
			...value.flow,
			spawnedAt: value.spawnedAt,
			completedAt,
			lastAddress,
			returnValue,
		});

		return this.tryCompletingAwaitFlowInstructions(completedAt);
	}

	private tryCompletingAwaitFlowInstructions(completedAt: number) {
		for (const [flowIdToSuspend, afi] of this.awaitFlowInstructions) {
			const resolvedBy = this.resolveAwait(afi);
			if (resolvedBy) {
				const resumedFlowStack = this.flowStackGenMap.get(flowIdToSuspend);
				if (!resumedFlowStack) {
					throw new Error('resolved await but flow did not resume!');
				}
				this.deleteAwaitFlowInstruction(flowIdToSuspend);
				this.completedAwaitFlowInstructions.set(flowIdToSuspend, {
					...afi,
					completedAt,
					resolvedBy,
				});

				const dependingFlowIds = afi.awaitDependencies.map((i) => i.waitingForFlow.id);
				const dependingActiveFlows = this.getActive().filter((f) =>
					dependingFlowIds.includes(f.flow.id)
				);
				const dependingSuspendedFlows = Array.from(this.suspendedFlowStackGenMap.values())
					.filter((f) => dependingFlowIds.includes(f.flowStack.flow.id))
					.map((f) => f.flowStack);

				const flowsToCancel = [...dependingActiveFlows, ...dependingSuspendedFlows];
				const cancelledFlows = flowsToCancel.flatMap((f) =>
					this.cancelFlow({
						flowStack: f,
						parentFlow: resumedFlowStack.flow,
						cancelledAt: completedAt,
						callerAddress: afi.callerAddress,
					})
				);
				return {
					cancelledFlows,
				};
			}
		}
	}

	private resolveAwait(params: AwaitFlowInstruction): CompletedFlow[] | undefined {
		const { flowIdToSuspend, strategy, awaitDependencies } = params;
		const completedFlows = Array.from(this.completedflows.values());
		if (strategy === AwaitResolvingStrategy.SINGLE) {
			const [awaitDependency] = awaitDependencies;
			const completedAwaitedFlow = completedFlows.find(
				(cf) => cf.id === awaitDependency.waitingForFlow.id
			);
			if (!completedAwaitedFlow) {
				return;
			}

			this.resumeFlow({
				flowId: flowIdToSuspend,
				returnValue: completedAwaitedFlow.returnValue,
			});
			return [completedAwaitedFlow];
		}

		if (strategy === AwaitResolvingStrategy.WAIT_FOR_ALL) {
			const flowIdsAwaitingFor = awaitDependencies.map((i) => i.waitingForFlow.id);
			const completedAwaitedFlows = completedFlows.filter((cf) =>
				flowIdsAwaitingFor.includes(cf.id)
			);
			if (completedAwaitedFlows.length < flowIdsAwaitingFor.length) {
				return;
			}

			const completedAwaitFlowsMap = lodash.keyBy(completedAwaitedFlows, 'id');
			const result: any[] = [];
			flowIdsAwaitingFor.forEach((id) => {
				const completedFlow = completedAwaitFlowsMap[id];
				result.push(completedFlow.returnValue);
			});

			this.resumeFlow({
				flowId: flowIdToSuspend,
				returnValue: result,
			});
			return completedAwaitedFlows;
		}

		const flowIdsAwaitingFor = awaitDependencies.map((i) => i.waitingForFlow.id);
		const completedAwaitedFlow = completedFlows.find((cf) =>
			flowIdsAwaitingFor.includes(cf.id)
		);
		if (!completedAwaitedFlow) {
			return;
		}

		this.resumeFlow({
			flowId: flowIdToSuspend,
			returnValue: completedAwaitedFlow.returnValue,
		});
		return [completedAwaitedFlow];
	}

	getActive() {
		return Array.from(this.flowStackGenMap, ([_, value]) => value);
	}

	list() {
		return {
			active: this.getActive().map((value) => value.flow),
			completed: Array.from(this.completedflows.values()),
			cancelled: Array.from(this.cancelledFlows.values()),
			suspended: Array.from(this.suspendedFlowStackGenMap.values()),
		};
	}

	suspendFlow(afi: AwaitFlowInstruction, suspendedAt: number) {
		const { flowIdToSuspend } = afi;
		const flowStack = this.flowStackGenMap.get(flowIdToSuspend);
		if (!flowStack) {
			throw new Error('Can not suspend flow! Not found!');
		}

		const isAlreadySuspended = this.awaitFlowInstructions.has(flowIdToSuspend);
		if (isAlreadySuspended) {
			throw new Error('Flow already suspended!');
		}

		this.addAwaitFlowInstruction(flowIdToSuspend, afi);

		this.flowStackGenMap.delete(flowIdToSuspend);
		this.suspendedFlowStackGenMap.set(flowIdToSuspend, {
			flowStack,
			awaitFlowInstruction: afi,
			suspendedAt,
		});

		this.tryCompletingAwaitFlowInstructions(suspendedAt);
	}

	isSuspended(params: { flowId: string }) {
		return this.suspendedFlowStackGenMap.has(params.flowId);
	}

	isCancelled(params: { flowId: string }) {
		return this.cancelledFlows.has(params.flowId);
	}

	isActive(params: { flowId: string }) {
		return this.flowStackGenMap.has(params.flowId);
	}

	isComplete(params: { flowId: string }) {
		return this.completedflows.has(params.flowId);
	}

	private addAwaitFlowInstruction(
		flowIdToSuspend: string,
		awaitFlowInstruction: AwaitFlowInstruction
	) {
		this.awaitFlowInstructions.set(flowIdToSuspend, awaitFlowInstruction);
	}

	private deleteInactiveAwaitFlowInstruction(suspendedFlowId: string) {
		const isParentFlowActive = this.isActive({
			flowId: suspendedFlowId,
		});
		if (isParentFlowActive) {
			throw new Error(
				'Attempting to delete await flow instructon even while the flow is active!'
			);
		}
		this.deleteAwaitFlowInstruction(suspendedFlowId);
	}

	private deleteAwaitFlowInstruction(suspendedFlowId: string) {
		this.awaitFlowInstructions.delete(suspendedFlowId);
	}

	private resumeFlow(params: { flowId: string; returnValue: any }) {
		const suspendedFlow = this.suspendedFlowStackGenMap.get(params.flowId);
		if (!suspendedFlow) {
			console.error('Can not resume flow! Not found!', params);
			throw new Error('Can not resume flow! Not found!');
		}
		this.suspendedFlowStackGenMap.delete(params.flowId);

		const { flowStack: suspendedFlowStack } = suspendedFlow;

		this.flowStackGenMap.set(params.flowId, suspendedFlowStack);

		const [executionRecord] = suspendedFlowStack.stack.peek(1);
		executionRecord.operations.push({
			name: ExecuteStackOperationNames.PROVIDE_GIVEN_PARAMS,
			params: params.returnValue,
		});
	}

	private cancelFlow(params: {
		flowStack: FlowStack;
		parentFlow: Flow;
		cancelledAt: number;
		callerAddress: Address;
	}) {
		const { cancelledAt, callerAddress } = params;
		const cancellableFlow = (() => {
			if (this.isActive({ flowId: params.flowStack.flow.id })) {
				return {
					type: 'active' as const,
					flowStack: this.flowStackGenMap.get(params.flowStack.flow.id)!,
					parent: params.parentFlow,
					callerAddress,
				};
			}
			if (this.isSuspended({ flowId: params.flowStack.flow.id })) {
				return {
					type: 'suspended' as const,
					flowStack: this.suspendedFlowStackGenMap.get(params.flowStack.flow.id)!
						.flowStack,
					parent: params.parentFlow,
					callerAddress,
				};
			}

			throw new Error('Trying to cancel a flow which is neither active nor suspended!');
		})();
		const aliveFlowsToCancel = [
			cancellableFlow,
			...this.findAllAliveChildFlows(params.flowStack),
		];
		const cancelledFlows = aliveFlowsToCancel.map((afc) => {
			if (afc.type === 'active') {
				this.flowStackGenMap.delete(afc.flowStack.flow.id);
			} else {
				this.suspendedFlowStackGenMap.delete(afc.flowStack.flow.id);
			}
			const cancelledFlow: CancelledFlow = {
				...afc.flowStack.flow,
				parentFlow: afc.parent,
				spawnedAt: afc.flowStack.spawnedAt,
				cancelledAt,
				callerAddress: afc.callerAddress,
				flowStack: afc.flowStack,
			};

			this.cancelledFlows.set(afc.flowStack.flow.id, cancelledFlow);
			this.deleteInactiveAwaitFlowInstruction(cancelledFlow.id);
			return cancelledFlow;
		});

		return cancelledFlows;
	}

	private findAllAliveChildFlows(flowStack: FlowStack): {
		type: 'active' | 'suspended';
		flowStack: FlowStack;
		parent: Flow;
		callerAddress?: Address;
	}[] {
		const afi = this.awaitFlowInstructions.get(flowStack.flow.id);
		if (!afi) {
			return [];
		}

		const childFlows = afi.awaitDependencies.map((d) => d.waitingForFlow.id);

		const activeChildFlows = childFlows
			.filter((flowId) => this.isActive({ flowId }))
			.map((flowId) => ({
				type: 'active' as const,
				flowStack: this.flowStackGenMap.get(flowId)!,
				parent: flowStack.flow,
			}));

		const suspendedChildFlows = childFlows
			.filter((flowId) => this.isSuspended({ flowId }))
			.map((flowId) => ({
				type: 'suspended' as const,
				flowStack: this.suspendedFlowStackGenMap.get(flowId)!.flowStack,
				parent: flowStack.flow,
			}));

		const aliveFlows = [...activeChildFlows, ...suspendedChildFlows];

		const childResults = aliveFlows.flatMap((af) => this.findAllAliveChildFlows(af.flowStack));

		const result = [...aliveFlows, ...childResults];

		return result;
	}
}
