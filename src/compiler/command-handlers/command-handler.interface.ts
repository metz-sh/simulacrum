import * as ts from 'typescript';
import { CompilerErrors, CompilerResponse, CompilerResponseCode } from '../compiler-types';

export abstract class CommandHandlerIterface {
	constructor(
		public program: ts.Program,
		public readonly host: {
			compilerHost: ts.CompilerHost;
			updateFile: (sourceFile: ts.SourceFile) => boolean;
		},
		public readonly fsMap: Map<string, string>,
		public readonly outputMap: Map<string, string>,
		public tag: string | number
	) {}

	abstract execute(): Promise<
		| ({
				responseCode: Exclude<CompilerResponseCode, CompilerResponseCode.INITIALIZED>;
		  } & {
				responseCode: CompilerResponseCode.ERRORED;
				errors: CompilerErrors;
		  })
		| {
				responseCode: Exclude<
					CompilerResponseCode,
					CompilerResponseCode.INITIALIZED | CompilerResponseCode.ERRORED
				>;
		  }
	>;
}
