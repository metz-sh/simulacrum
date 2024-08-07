import { CompilerErrorCode } from './compliler-error-codes';

export type KeywordFlags = {
	isMarked: boolean;
	isHidden?: boolean;
	isConstructorBased?: boolean;
	view?: ViewFlag;
	delegateToParent?: boolean;
	collapsed?: boolean;
};

export type ViewFlag = {
	type: 'table' | 'simple' | 'collection' | 'keyvalue';
} & (
	| {
			type: 'table';
			columns: string[];
	  }
	| {
			type: 'simple' | 'collection' | 'keyvalue';
	  }
);

export type ParsedExpandDecorator = { name: 'expand' };
export type ParsedIgnoreDecorator = { name: 'ignore' };
export type ParsedMethod = {
	methodName: string;
	comment?: string;
	signature?: string;
	parameters?: { name: string; type: string; text: string }[];
	returnType?: string;
	argumentHash?: string;
	flags: Omit<KeywordFlags, 'isConstructorBased' | 'view'>;
};
export type Keyword = {
	className: string;
	properties: {
		name: string;
		show?: boolean;
	}[];
	comment?: string;
	flags: KeywordFlags;
	filePath: string;
	methods: ParsedMethod[];
};
export type Keywords = Keyword[];
export type ClassyKeywords = (Keyword & { class: { new (): any } })[];

export const enum FunctionState {
	PROVIDE_INPUT = 'PROVIDE_INPUT',
	PREPARE_TO_CALL_NODE = 'PREPARE_TO_CALL_NODE',
	PREPARE_TO_INVOKE_NODE = 'PREPARE_TO_INVOKE_NODE',
	CALL_NODE = 'CALL_NODE',
	INVOKE_NODE = 'INVOKE_NODE',
	HANDLE_CALL_RESULT = 'HANDLE_CALL_RESULT',
}

export enum CompilerCommand {
	INIT = 'INIT',
	COMPILE = 'COMPILE',
	BUILD = 'BUILD',
	BUILD_PREVIEW = 'BUILD_PREVIEW',
}

export type CompilerCommandRequest = {
	command: CompilerCommand;
} & (
	| {
			command: CompilerCommand.INIT;
			fs: Map<string, string>;
	  }
	| {
			command: CompilerCommand.COMPILE;
			fs: Map<string, string>;
	  }
	| {
			command: CompilerCommand.BUILD;
			fs: Map<string, string>;
			projectName: string;
			projectVersion: number;
	  }
	| {
			command: CompilerCommand.BUILD_PREVIEW;
			fs: Map<string, string>;
			projectName: string;
			projectVersion: number;
	  }
);

export type CompilerCommandEvent = {
	command: CompilerCommand;
} & (
	| {
			command: CompilerCommand.INIT | CompilerCommand.COMPILE;
			fs: [Uint8Array, Uint8Array][];
	  }
	| {
			command: CompilerCommand.BUILD | CompilerCommand.BUILD_PREVIEW;
			fs: [Uint8Array, Uint8Array][];
			projectName: string;
			projectVersion: number;
	  }
);

export enum CompilerResponseCode {
	INITIALIZED = 'INITIALIZED',
	COMPILED = 'COMPILED',
	BUILT = 'BUILT',
	BUILT_PREVIEW = 'BUILT_PREVIEW',
	ERRORED = 'ERRORED',
}

export type CompilerError = {
	sourceable: boolean;
	highlights?: string[];
} & (
	| {
			sourceable: true;
			fileName: string;
			message: string;
			position: {
				startLine: number;
				startCharacter: number;
				endLine: number;
				endCharacter: number;
			};
			code?: CompilerErrorCode;
	  }
	| {
			sourceable: false;
			message?: string;
			code: CompilerErrorCode;
	  }
);

export type CompilerErrors = CompilerError[];

export type CompilerResponse = {
	responseCode: CompilerResponseCode;
	responseFor: CompilerCommand;
} & (
	| {
			responseCode: CompilerResponseCode.INITIALIZED;
	  }
	| {
			responseCode:
				| CompilerResponseCode.COMPILED
				| CompilerResponseCode.BUILT
				| CompilerResponseCode.BUILT_PREVIEW;
			fs: [Uint8Array, Uint8Array][];
			tag: string | number;
	  }
	| {
			responseCode: CompilerResponseCode.ERRORED;
			errors: CompilerErrors;
	  }
);
