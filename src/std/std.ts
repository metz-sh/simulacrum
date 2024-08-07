import * as lodash from 'lodash';
import { Runtime } from '../runtime/runtime';
import {
	AwaitFlowInstruction,
	AwaitResolvingStrategy,
	Flow,
	FlowCompletionListener,
	MethodRuntimeCommands,
} from '../runtime/runtime-types';
import { FlowExecutor } from '../runtime/flow-executor';

function createAwaitFlowInstruction(params: {
	flowExecutors: FlowExecutor[];
	meta: {
		isDependency: boolean;
		flowId: string;
		startingAddress: string;
		offset: string;
	};
	strategy: AwaitResolvingStrategy;
	runtime: Runtime;
}) {
	const { flowExecutors, meta, strategy, runtime } = params;
	const { isDependency, startingAddress, offset, flowId: flowIdToSuspend } = meta;

	const flows = flowExecutors.map((fe) => fe.run());
	const awaitFlowInstruction: AwaitFlowInstruction = {
		flowIdToSuspend,
		strategy,
		callerAddress: {
			startingAddress,
			offset,
		},
		awaitDependencies: flows.map((flow) => ({
			waitingForFlow: flow,
		})),
		isDependency,
		submittedAt: runtime.getCurrentTick(),
	};

	return awaitFlowInstruction;
}

export function createStandardLibrary(runtime: Runtime, projectName: string) {
	return {
		resolve(classReference: new () => any) {
			const partition = runtime.partition.get(projectName);
			if (!partition) {
				throw new Error(`partition not found for ${projectName}`);
			}
			return partition.di.get(classReference.name);
		},

		sleep() {
			console.warn('Sleeping is only enabled in project code, nowhere else! 😴');
		},

		flow<T extends Object>(
			name: string,
			object: T,
			schedule: { after: number } | { every: number } | 'immediate' = 'immediate'
		) {
			const proxiedObject = new Proxy(object, {
				get(objectTarget, p, receiver) {
					if (typeof (objectTarget as any)[p] === 'function') {
						return new Proxy((objectTarget as any)[p], {
							apply(target, thisArg, argArray) {
								const generatorRecipe = {
									target: objectTarget,
									generatorFactory: (objectTarget as any)[p],
									factoryParams: argArray,
								};
								if (schedule === 'immediate') {
									return new FlowExecutor(runtime, { name }, generatorRecipe);
								}
								const type = Object.hasOwn(schedule, 'after')
									? 'timer'
									: ('interval' as const);
								const ticks =
									type === 'timer'
										? (schedule as any).after
										: (schedule as any).every;

								runtime.registerScheduledTask({
									name,
									ticks,
									type,
									generatorRecipe,
								});
							},
						});
					}
				},
			});

			return proxiedObject;
		},

		*awaitAll(
			flowExecutors: FlowExecutor[],
			meta: {
				isDependency: boolean;
				flowId: string;
				startingAddress: string;
				offset: string;
			}
		): any {
			const { startingAddress, offset } = meta;
			const awaitFlowInstruction = createAwaitFlowInstruction({
				flowExecutors,
				meta,
				strategy: AwaitResolvingStrategy.WAIT_FOR_ALL,
				runtime,
			});

			return yield {
				command: MethodRuntimeCommands.AWAIT_FLOW,
				awaitFlowInstruction,
				startingAddress,
				offset,
			};
		},

		*awaitRace(
			flowExecutors: FlowExecutor[],
			meta: {
				isDependency: boolean;
				flowId: string;
				startingAddress: string;
				offset: string;
			}
		): any {
			const { startingAddress, offset } = meta;
			const awaitFlowInstruction = createAwaitFlowInstruction({
				flowExecutors,
				meta,
				strategy: AwaitResolvingStrategy.RACE,
				runtime,
			});

			return yield {
				command: MethodRuntimeCommands.AWAIT_FLOW,
				awaitFlowInstruction,
				startingAddress,
				offset,
			};
		},

		currentTick() {
			return runtime.getCurrentTick();
		},
	};
}
