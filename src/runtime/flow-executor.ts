import { Runtime } from './runtime';
import {
	AwaitFlowInstruction,
	AwaitResolvingStrategy,
	Flow,
	GeneratorRecipe,
	MethodRuntimeCommands,
} from './runtime-types';

export class FlowExecutor {
	constructor(
		private readonly runtime: Runtime,
		private readonly params: Omit<Flow, 'id'>,
		private readonly generatorRecipe: GeneratorRecipe
	) {}

	run() {
		return this.runtime.registerNewExecution(this.params, this.generatorRecipe);
	}

	*await(meta: {
		isDependency: boolean;
		flowId: string;
		startingAddress: string;
		offset: string;
	}): any {
		const startedFlow = this.runtime.registerNewExecution(this.params, this.generatorRecipe);
		const { isDependency, startingAddress, offset, flowId: flowIdToSuspend } = meta;
		const awaitFlowInstruction: AwaitFlowInstruction = {
			flowIdToSuspend,
			strategy: AwaitResolvingStrategy.SINGLE,
			callerAddress: {
				startingAddress,
				offset,
			},
			awaitDependencies: [
				{
					waitingForFlow: startedFlow,
				},
			],
			isDependency,
			submittedAt: this.runtime.getCurrentTick(),
		};

		return yield {
			command: MethodRuntimeCommands.AWAIT_FLOW,
			awaitFlowInstruction,
			startingAddress,
			offset,
		};
	}
}
