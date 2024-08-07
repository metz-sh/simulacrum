import { Address } from './heap';

export enum ExecuteStackOperationNames {
	PROVIDE_PARAMS = 'PROVIDE_PARAMS',
	PROVIDE_RETURN_VALUE_AND_POP = 'PROVIDE_RETURN_VALUE_AND_POP',
	PROVIDE_GIVEN_PARAMS = 'PROVIDE_GIVEN_PARAMS',
}

export type ExecuteStackOperations = {
	name: ExecuteStackOperationNames;
} & (
	| {
			name: ExecuteStackOperationNames.PROVIDE_PARAMS;
	  }
	| {
			name: ExecuteStackOperationNames.PROVIDE_RETURN_VALUE_AND_POP;
			returnValue: any;
			unloading: Address;
	  }
	| {
			name: ExecuteStackOperationNames.PROVIDE_GIVEN_PARAMS;
			params: any;
	  }
);

export type ExecutionStackRecord = {
	address: Address;
	params: [] | [any];
	operations: ExecuteStackOperations[];
	context?: {
		isDependency?: boolean;
	};
};

export class ExecutionStack {
	private stack: ExecutionStackRecord[] = [];

	push(record: ExecutionStackRecord) {
		this.stack.push(record);
	}

	pop() {
		if (!this.stack.length) {
			throw new Error('Can not pop, stack is empty!');
		}
		return this.stack.pop()!;
	}

	peek(count: number) {
		if (count > this.stack.length) {
			throw new Error(
				`Can not peek, stack has ${this.stack.length} elements but requested ${count}!`
			);
		}
		return this.stack.slice(-count);
	}

	size() {
		return this.stack.length;
	}

	getRoot() {
		return this.stack.at(0);
	}
}
