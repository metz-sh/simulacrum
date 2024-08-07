import { type DIContainer } from './di-container';
import { type ExecutionStack } from './execution-stack';
import { type Address } from './heap';

export enum MethodRuntimeCommands {
	LOAD = 'load',
	LOG = 'log',
	UNLOAD = 'unload',
	HALT = 'halt',
	NO_OP = 'no_op',
	AWAIT_FLOW = 'await_flow',
}

export type MethodRuntimeContext = {
	isDependency?: boolean;
	flowId: string;
};

export type MethodRuntimeYields = {
	command: MethodRuntimeCommands;
	startingAddress: string;
	offset: string;
	context?: MethodRuntimeContext;
} & (
	| {
			command: MethodRuntimeCommands.LOAD;
			params: [] | [any];
	  }
	| {
			command: MethodRuntimeCommands.LOG;
			logs: any[];
	  }
	| {
			command: MethodRuntimeCommands.UNLOAD;
			returnValue: any;
	  }
	| {
			command: MethodRuntimeCommands.HALT;
			coveredHalts: number;
			haltedFor: number;
	  }
	| {
			command: MethodRuntimeCommands.AWAIT_FLOW;
			awaitFlowInstruction: AwaitFlowInstruction;
	  }
	| {
			command: MethodRuntimeCommands.NO_OP;
	  }
);

export type PartitionedStorage = {
	di: DIContainer;
};

export enum TickResponseCodes {
	LOAD = 'LOAD',
	LOG = 'LOG',
	SEND_DATA = 'SEND_DATA',
	CALL_DEPENDENCY = 'CALL_DEPENDENCY',
	RESOLVE_DEPENDENCY = 'RESOLVE_DEPENDENCY',
	UNLOAD = 'UNLOAD',
	HALT = 'HALT',
}

export type TickResponses = {
	tick: number;
	code: TickResponseCodes;
	address: Address;
	isAutoPop?: boolean;
} & (
	| {
			code: TickResponseCodes.LOAD;
			params: any[];
	  }
	| {
			code: TickResponseCodes.LOG;
			logs: any[];
	  }
	| {
			code: TickResponseCodes.SEND_DATA;
			source: Address;
			destination: Address;
	  }
	| {
			code: TickResponseCodes.CALL_DEPENDENCY;
			source: Address;
			destination: Address;
	  }
	| {
			code: TickResponseCodes.RESOLVE_DEPENDENCY;
			source: Address;
			destination: Address;
	  }
	| {
			code: TickResponseCodes.UNLOAD;
			returnValue: any;
	  }
	| {
			code: TickResponseCodes.HALT;
			coveredHalts: number;
			haltedFor: number;
	  }
);

export type RuntimeGenerator = AsyncGenerator<MethodRuntimeYields, Object, any>;

export type TickResultType = 'yielded' | 'constructed';
export type TickResult = {
	type: TickResultType;
	autoPopped?: {
		flow: Flow;
		tickResponses?: TickResponses[];
		cancelFlows?: Flow[];
	};
} & (
	| {
			type: 'yielded';
			flow: Flow;
			tickResponses: TickResponses[];
	  }
	| {
			type: 'constructed';
			cancelledFlows?: CancelledFlow[];
	  }
);

export enum SetupReason {
	FLOW_AWAITED = 'flow_awaited',
}

export type SetupInstruction = {
	reason: SetupReason;
	tickResult: TickResult;
};

export type TickResultContainer = {
	setupInstructions: SetupInstruction[];
	tickResults: TickResult[];
};

export type Flow = {
	id: string;
	name: string;
};

export type GeneratorRecipe = {
	target: any;
	generatorFactory: (...args: any[]) => RuntimeGenerator;
	factoryParams: any[];
};

export type ScheduledTask = {
	id: string;
	name: string;
	ticks: number;
	type: 'timer' | 'interval';
	generatorRecipe: GeneratorRecipe;
};

export type CreateScheduledTaskParams = {
	name: string;
	ticks: number;
	type: 'timer' | 'interval';
	generatorRecipe: GeneratorRecipe;
};

export enum SchedulerCommands {
	NO_OP = 'no_op',
	SPAWN = 'spawn',
}

export type SchedulerYields =
	| {
			command: SchedulerCommands.NO_OP;
	  }
	| {
			command: SchedulerCommands.SPAWN;
			generatorRecipe: GeneratorRecipe;
			flowName: string;
	  };

export type SchedulerGenerator = Generator<SchedulerYields, void, void>;

export interface Scheduler {
	tick(): SchedulerGenerator;
}

export type FlowCompletionListener = (params: { flow: Flow; returnValue: Object }) => void;
export type AwaitDependency = {
	waitingForFlow: Flow;
};
export type AwaitFlowInstruction = {
	flowIdToSuspend: string;
	strategy: AwaitResolvingStrategy;
	callerAddress: {
		startingAddress: string;
		offset: string;
	};
	isDependency: boolean;
	awaitDependencies: AwaitDependency[];
	submittedAt: number;
};

export type FlowStack = {
	generator: RuntimeGenerator;
	stack: ExecutionStack;
	flow: Flow;
	spawnedAt: number;
};

export type CompletedAwaitFlowInstruction = AwaitFlowInstruction & {
	completedAt: number;
	resolvedBy: CompletedFlow[];
};
export type CompletedFlow = Flow & {
	spawnedAt: number;
	completedAt: number;
	lastAddress: Address;
	returnValue: any;
};
export type CancelledFlow = Flow & {
	spawnedAt: number;
	cancelledAt: number;
	parentFlow: Flow;
	flowStack: FlowStack;
	callerAddress?: Address;
};
export type SuspendedFlow = {
	suspendedAt: number;
	flowStack: FlowStack;
	awaitFlowInstruction: AwaitFlowInstruction;
};

export const enum AwaitResolvingStrategy {
	SINGLE = 'single',
	WAIT_FOR_ALL = 'wait_for_all',
	RACE = 'race',
}

export type ExecuteStackResult = { tickResult: TickResult } & (
	| {
			tickResult: TickResult & { type: 'yielded' };
			yieldedValue: MethodRuntimeYields;
	  }
	| {
			tickResult: TickResult & { type: 'constructed' };
	  }
);
