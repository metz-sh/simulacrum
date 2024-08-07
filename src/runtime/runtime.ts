import * as lodash from 'lodash';
import { DIContainer } from './di-container';
import { AutoPopManager } from './effects/auto-pop';
import { ExecuteStackOperationNames, ExecutionStack } from './execution-stack';
import { FlowManager } from './flow-manager';
import { Address, Allocatable, Heap, createLocationFromAddress } from './heap';
import {
	AwaitResolvingStrategy,
	CompletedAwaitFlowInstruction,
	CreateScheduledTaskParams,
	ExecuteStackResult,
	Flow,
	FlowStack,
	GeneratorRecipe,
	MethodRuntimeCommands,
	MethodRuntimeYields,
	PartitionedStorage,
	ScheduledTask,
	SchedulerCommands,
	SchedulerGenerator,
	SetupInstruction,
	SetupReason,
	SuspendedFlow,
	TickResponseCodes,
	TickResponses,
	TickResult,
	TickResultContainer,
} from './runtime-types';
import { ScheduledTaskManager } from './scheduled-task-manager';

export class Runtime {
	private currentTick = 0;
	private flowManager = new FlowManager();
	private scheduledTaskManager = new ScheduledTaskManager();
	private heap = new Heap();
	private autoPopManager = new AutoPopManager();

	partition = new Map<string, PartitionedStorage>();

	isFinished() {
		return (
			!this.flowManager.list().active.length &&
			!this.scheduledTaskManager.list().active.length
		);
	}

	getCurrentTick() {
		return this.currentTick;
	}

	entities() {
		return {
			flows: this.flowManager.list(),
			scheduledTasks: this.scheduledTaskManager.list(),
			tick: this.currentTick,
		};
	}

	registerInstance(instance: Allocatable) {
		let startingAddress = this.heap.allocate(instance);
		instance.__starting_address = startingAddress;
	}

	registerNewExecution(params: Omit<Flow, 'id'>, generatorRecipe: GeneratorRecipe) {
		return this.flowManager.createFlow(params, generatorRecipe, this.currentTick);
	}

	registerScheduledTask(params: CreateScheduledTaskParams) {
		return this.scheduledTaskManager.createScheduledTask(params);
	}

	getHeap() {
		return this.heap;
	}

	createPartionedStorage(name: string) {
		const storage: PartitionedStorage = { di: new DIContainer() };
		this.partition.set(name, storage);
		return storage;
	}

	addAutoPopEffect(effectId: string, affectedEntities: string[]) {
		this.autoPopManager.addAffectedTree(effectId, affectedEntities);

		// const activeFlows = this.flowManager.getActive();

		// for (const { flow, stack: executionRecords } of activeFlows) {
		//     const isTracked = !!this.autoPopManager.getTracked(flow.id, effectId);
		//     if (isTracked) {
		//         continue;
		//     }

		//     const stack = executionRecords.peek(executionRecords.size());
		//     for (let index = 0; index < stack.length; index++) {
		//         const executionRecord = stack[index];
		//         const entityId = this.heap.translateAddress(createLocationFromAddress(executionRecord.address));
		//         if (affectedEntities.includes(entityId)) {
		//             const pendingOperation = executionRecord.operations.at(0);
		//             if (pendingOperation?.name === ExecuteStackOperationNames.PROVIDE_RETURN_VALUE_AND_POP) {
		//                 break;
		//             }
		//             this.autoPopManager.track(flow.id, effectId, entityId);
		//             break;
		//         }
		//     }
		// }
	}

	private getAwaitedTickResponses(params: {
		suspendedFlows: SuspendedFlow[];
		resultContainer: TickResultContainer;
		tickResponseFilterPredicate: (
			tickResponse: TickResponses,
			flow: Flow,
			suspendedFlow: SuspendedFlow
		) => boolean;
	}) {
		const tickResults = params.resultContainer.tickResults.filter(
			(tr) => tr.type === 'yielded'
		);
		const tickResultMap = lodash.keyBy(tickResults, (tr) => tr.flow.id);

		const result = params.suspendedFlows
			.map((sf) => {
				const relevantTickResponses = sf.awaitFlowInstruction.awaitDependencies
					.map((a) => {
						const tickResult = tickResultMap[a.waitingForFlow.id];
						if (!tickResult) {
							return;
						}

						const relevantTickResponses = tickResult.tickResponses.filter((tres) =>
							params.tickResponseFilterPredicate(tres, tickResult.flow, sf)
						);
						return relevantTickResponses;
					})
					.filter((_) => !!_)
					.flat();

				return relevantTickResponses.map((rtr) => ({
					tickResponse: rtr,
					suspendedFlow: sf,
				}));
			})
			.flat();

		return result;
	}

	private addSetupForJustSpawnedFlows(resultContainer: TickResultContainer) {
		const suspendedFlows = this.flowManager.list().suspended;
		const spawnedInCurrentTickSuspendedFlows = suspendedFlows.filter(
			(s) => s.awaitFlowInstruction.submittedAt === this.currentTick
		);

		const awaitedTickResponses = this.getAwaitedTickResponses({
			suspendedFlows: spawnedInCurrentTickSuspendedFlows,
			resultContainer,
			tickResponseFilterPredicate(tickResponse) {
				return tickResponse.code === TickResponseCodes.LOAD;
			},
		});

		const setupInstructions = awaitedTickResponses.map((atr) => {
			const {
				tickResponse: { address: destinationAddress },
				suspendedFlow,
			} = atr;
			const {
				awaitFlowInstruction: { isDependency, callerAddress: sourceAddress },
			} = suspendedFlow;
			const setupInstruction: SetupInstruction = {
				reason: SetupReason.FLOW_AWAITED,
				tickResult: {
					type: 'yielded',
					flow: atr.suspendedFlow.flowStack.flow,
					tickResponses: [
						{
							tick: this.currentTick,
							isAutoPop: false,
							code: isDependency
								? TickResponseCodes.CALL_DEPENDENCY
								: TickResponseCodes.SEND_DATA,
							address: sourceAddress,
							source: sourceAddress,
							destination: destinationAddress,
						},
					],
				},
			};

			return setupInstruction;
		});

		resultContainer.setupInstructions.push(...setupInstructions);
	}

	private addSetupForResumedFlows(
		flowStack: FlowStack,
		completedAwaitFlowInstruction: CompletedAwaitFlowInstruction,
		resultContainer: TickResultContainer
	) {
		const flowsWhichCompletedToResumeUs = completedAwaitFlowInstruction.resolvedBy;
		const setupInstructions = flowsWhichCompletedToResumeUs.map((completedFlow) => {
			const destinationAddress = completedFlow.lastAddress;
			const sourceAddress = completedAwaitFlowInstruction.callerAddress;

			const setupInstruction: SetupInstruction = {
				reason: SetupReason.FLOW_AWAITED,
				tickResult: {
					type: 'yielded',
					flow: flowStack.flow,
					tickResponses: [
						{
							tick: this.currentTick,
							isAutoPop: false,
							code: TickResponseCodes.RESOLVE_DEPENDENCY,
							address: sourceAddress,
							source: sourceAddress,
							destination: destinationAddress,
						},
					],
				},
			};

			return setupInstruction;
		});

		resultContainer.setupInstructions.push(...setupInstructions);
	}

	async tick(
		coveredFlows: string[] = [],
		coveredScheduledTasks: string[] = [],
		resultContainer: TickResultContainer = {
			tickResults: [],
			setupInstructions: [],
		}
	): Promise<TickResultContainer> {
		const stacksToConsider = (() => {
			const activeFlows = this.flowManager.getActive();
			return activeFlows.filter(({ flow }) => !coveredFlows.includes(flow.id));
		})();
		const scheduleTasksToConsider = (() => {
			const activeScheduledTasks = this.scheduledTaskManager.getActive();
			return activeScheduledTasks.filter(
				({ task }) => !coveredScheduledTasks.includes(task.id)
			);
		})();

		if (!stacksToConsider.length && !scheduleTasksToConsider.length) {
			// this.updateTickResultsForCancelledFlows(resultContainer);
			// this.updateTickResultsForAwaitFlowInstructions(resultContainer);
			this.currentTick++;
			return resultContainer;
		}

		const activeFlows = this.flowManager.getActive();
		const activeScheduledTasks = this.scheduledTaskManager.getActive();

		const result = (
			await Promise.all(
				stacksToConsider.map((flowStack) => {
					return this.processStack(flowStack);
				})
			)
		)
			.flat()
			.filter((_) => !!_);
		const tickResults = result.map((r) => r.tickResults).flat();
		const setupInstructions = result.map((r) => r.setupInstructions).flat();

		resultContainer.setupInstructions.push(...setupInstructions);
		resultContainer.tickResults.push(...tickResults);

		scheduleTasksToConsider.forEach(({ schedulerGenerator, task }) => {
			this.processScheduledTask(schedulerGenerator, task);
		});

		return this.tick(
			activeFlows.map(({ flow }) => flow.id),
			activeScheduledTasks.map(({ task }) => task.id),
			resultContainer
		);
	}

	resetStacks() {
		this.flowManager = new FlowManager();
		this.scheduledTaskManager = new ScheduledTaskManager();
	}

	reset() {
		this.currentTick = 0;
		this.resetStacks();
		this.getHeap().reset();
		this.partition.clear();
		this.resetAutoPop();
	}

	getStoredResultsFromAutoPop() {
		return this.autoPopManager.flushAllStoredTickResults();
	}

	resetAutoPop() {
		const storedTickResults = this.autoPopManager.flushAllStoredTickResults();
		this.autoPopManager = new AutoPopManager();

		return storedTickResults;
	}

	private processScheduledTask(schedulerGenerator: SchedulerGenerator, task: ScheduledTask) {
		const { done, value } = schedulerGenerator.next();
		if (done) {
			this.scheduledTaskManager.deleteTask(task.id);
			return;
		}

		if (value.command === SchedulerCommands.NO_OP) {
			return;
		}

		const { generatorRecipe, flowName } = value;
		this.registerNewExecution(
			{
				name: flowName,
			},
			generatorRecipe
		);
	}

	private extractWork(stack: ExecutionStack) {
		if (!stack.size()) {
			return;
		}
		const [record] = stack.peek(1);
		const operation = record.operations.pop();
		if (!operation) {
			return;
		}

		return { record, operation };
	}

	private shouldRecurse(resultContainer: TickResultContainer) {
		const getCrossTalkFromTickResult = (tickResult: TickResult) => {
			if (tickResult.type === 'constructed') {
				return [];
			}

			return tickResult.tickResponses
				.map((tr) => {
					if (tr.code === TickResponseCodes.CALL_DEPENDENCY) {
						return tr;
					}
					if (tr.code === TickResponseCodes.RESOLVE_DEPENDENCY) {
						return tr;
					}
					if (tr.code === TickResponseCodes.SEND_DATA) {
						return tr;
					}
				})
				.filter((_) => !!_);
		};
		const crossTalkTickResponsesFromSetupInstructions = resultContainer.setupInstructions
			.map((i) => getCrossTalkFromTickResult(i.tickResult))
			.flat();

		const crossTalkTickResponsesFromTickResults = resultContainer.tickResults
			.map((tr) => getCrossTalkFromTickResult(tr))
			.flat();

		const crossTalks = [
			...crossTalkTickResponsesFromSetupInstructions,
			...crossTalkTickResponsesFromTickResults,
		];

		if (!crossTalks.length) {
			return false;
		}

		const isAllCrossTalkInternalToEffect = crossTalks.every((ct) => {
			const sourceLocation = this.heap.translateAddress(createLocationFromAddress(ct.source));
			const destinationLocation = this.heap.translateAddress(
				createLocationFromAddress(ct.destination)
			);
			const sourceEntityAffectby = this.autoPopManager.getEntityAffectedBy(sourceLocation);
			const destinationEntityAffectby =
				this.autoPopManager.getEntityAffectedBy(destinationLocation);

			if (!sourceEntityAffectby || !destinationEntityAffectby) {
				return false;
			}

			return sourceEntityAffectby === destinationEntityAffectby;
		});

		return isAllCrossTalkInternalToEffect;
	}

	private async processStack(
		flowStack: FlowStack,
		isRecursing = false
	): Promise<TickResultContainer | undefined> {
		const resultContainer: TickResultContainer = {
			setupInstructions: [],
			tickResults: [],
		};
		const stackExecutionResult = await this.executeStack(flowStack);
		if (!stackExecutionResult) {
			return;
		}

		if (stackExecutionResult) {
			resultContainer.tickResults.push(stackExecutionResult.tickResult);
		}

		const didWeJustSpawn =
			flowStack.spawnedAt === this.currentTick && flowStack.stack.size() === 1;
		const stackExecutionTickResult =
			stackExecutionResult?.tickResult.type === 'yielded'
				? stackExecutionResult.tickResult.tickResponses.at(0)
				: undefined;
		if (didWeJustSpawn && stackExecutionTickResult?.code === TickResponseCodes.LOAD) {
			this.addSetupForJustSpawnedFlows(resultContainer);
		}

		const ourCompletedAwaitFlowInstruction = this.flowManager.getCompletedAwaitFlowInstruction({
			flowId: flowStack.flow.id,
		});
		const didWeJustResume = ourCompletedAwaitFlowInstruction?.completedAt === this.currentTick;
		if (didWeJustResume) {
			this.addSetupForResumedFlows(
				flowStack,
				ourCompletedAwaitFlowInstruction,
				resultContainer
			);
		}

		if (!this.shouldRecurse(resultContainer)) {
			if (isRecursing) {
				this.autoPopManager.addToTickResultStore(resultContainer);
				return;
			}
			return resultContainer;
		}
		this.autoPopManager.addToTickResultStore(resultContainer);
		this.processStack(flowStack, true);
	}

	private async executeStack(flowStack: FlowStack): Promise<ExecuteStackResult | undefined> {
		const { flow, generator, stack } = flowStack;

		if (
			this.flowManager.isCancelled({
				flowId: flow.id,
			}) ||
			this.flowManager.isSuspended({
				flowId: flow.id,
			})
		) {
			return;
		}
		const work = this.extractWork(stack);
		const paramsForGenerator: any[] = [];
		if (work) {
			const { record, operation } = work;

			if (operation.name === ExecuteStackOperationNames.PROVIDE_RETURN_VALUE_AND_POP) {
				stack.pop();
			}

			const params = (() => {
				if (operation.name === ExecuteStackOperationNames.PROVIDE_PARAMS) {
					return record.params;
				}
				if (operation.name === ExecuteStackOperationNames.PROVIDE_GIVEN_PARAMS) {
					return operation.params;
				}
				return operation.returnValue;
			})();

			paramsForGenerator.push(params);
		}

		const { done, value } = await generator.next(...(paramsForGenerator as [any]));
		if (done) {
			if (work?.operation.name !== ExecuteStackOperationNames.PROVIDE_RETURN_VALUE_AND_POP) {
				throw new Error('Method can not be completed without a return!');
			}
			const unloadingOperationCausingComplete = work.operation;

			const result = this.flowManager.markFlowComplete({
				flowId: flow.id,
				returnValue: value,
				completedAt: this.currentTick,
				lastAddress: unloadingOperationCausingComplete.unloading,
			});
			const constructedTickResult: TickResult & { type: 'constructed' } = {
				type: 'constructed',
				cancelledFlows: result?.cancelledFlows,
			};
			return {
				tickResult: constructedTickResult,
			};
		}
		this.syncStateToStack(value, stack);

		if (value.command === MethodRuntimeCommands.AWAIT_FLOW) {
			const isCancelled = this.flowManager.isCancelled({
				flowId: flow.id,
			});
			if (!isCancelled) {
				this.flowManager.suspendFlow(value.awaitFlowInstruction, this.currentTick);
			}
			return;
		}

		const result = this.parseToTickResult(flow, value, stack);
		return {
			tickResult: result,
			yieldedValue: value,
		};
	}

	private parseToTickResult(
		flow: Flow,
		yieldedValue: MethodRuntimeYields,
		stack: ExecutionStack,
		isAutoPop?: boolean
	): TickResult & { type: 'yielded' } {
		const tickResponses: TickResponses[] = [];
		const address: Address = {
			startingAddress: yieldedValue.startingAddress,
			offset: yieldedValue.offset,
		};
		const tick = this.currentTick;
		if (yieldedValue.command === MethodRuntimeCommands.LOG) {
			return {
				type: 'yielded',
				flow,
				tickResponses: [
					{
						tick,
						isAutoPop,
						code: TickResponseCodes.LOG,
						address,
						logs: yieldedValue.logs,
					},
				],
			};
		}
		if (yieldedValue.command === MethodRuntimeCommands.HALT) {
			return {
				type: 'yielded',
				flow,
				tickResponses: [
					{
						tick,
						isAutoPop,
						code: TickResponseCodes.HALT,
						address,
						coveredHalts: yieldedValue.coveredHalts,
						haltedFor: yieldedValue.haltedFor,
					},
				],
			};
		}
		if (yieldedValue.command === MethodRuntimeCommands.LOAD) {
			if (stack.size() >= 2) {
				const [sourceRecord, destinationRecord] = stack.peek(2);
				if (destinationRecord.context?.isDependency) {
					tickResponses.push({
						tick,
						isAutoPop,
						code: TickResponseCodes.CALL_DEPENDENCY,
						address: sourceRecord.address,
						source: sourceRecord.address,
						destination: destinationRecord.address,
					});
				} else {
					tickResponses.push({
						tick,
						isAutoPop,
						code: TickResponseCodes.SEND_DATA,
						address: sourceRecord.address,
						source: sourceRecord.address,
						destination: destinationRecord.address,
					});
				}
			}
			tickResponses.push({
				tick,
				isAutoPop,
				code: TickResponseCodes.LOAD,
				address,
				params: yieldedValue.params,
			});
			return {
				type: 'yielded',
				flow,
				tickResponses,
			};
		}

		if (yieldedValue.command === MethodRuntimeCommands.UNLOAD) {
			if (stack.size() >= 2) {
				const [sourceRecord, destinationRecord] = stack.peek(2);
				if (destinationRecord.context?.isDependency) {
					tickResponses.push({
						tick,
						isAutoPop,
						code: TickResponseCodes.RESOLVE_DEPENDENCY,
						address: sourceRecord.address,
						source: sourceRecord.address,
						destination: destinationRecord.address,
					});
				}
			}
			tickResponses.push({
				tick,
				isAutoPop,
				code: TickResponseCodes.UNLOAD,
				address,
				returnValue: yieldedValue.returnValue,
			});
		}

		return {
			type: 'yielded',
			flow,
			tickResponses,
		};
	}

	private syncStateToStack(value: MethodRuntimeYields, stack: ExecutionStack) {
		if (
			value.command === MethodRuntimeCommands.LOG ||
			value.command === MethodRuntimeCommands.HALT ||
			value.command === MethodRuntimeCommands.NO_OP ||
			value.command === MethodRuntimeCommands.AWAIT_FLOW
		) {
			return;
		}
		if (value.command === MethodRuntimeCommands.LOAD) {
			stack.push({
				address: {
					startingAddress: value.startingAddress,
					offset: value.offset,
				},
				params: value.params,
				context: value.context,
				operations: [
					{
						name: ExecuteStackOperationNames.PROVIDE_PARAMS,
					},
				],
			});
			return;
		}

		const [record] = stack.peek(1);
		record.operations.push({
			name: ExecuteStackOperationNames.PROVIDE_RETURN_VALUE_AND_POP,
			returnValue: value.returnValue,
			unloading: {
				startingAddress: value.startingAddress,
				offset: value.offset,
			},
		});
	}
}
