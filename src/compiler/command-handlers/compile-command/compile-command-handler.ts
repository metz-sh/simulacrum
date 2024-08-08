import * as lodash from 'lodash';
import { CompilerResponseCode, Keywords } from '../../compiler-types';
import { CommandHandlerIterface } from '../command-handler.interface';
import { KeywordParser } from '../utils/keyword-parser/keyword-parser';
import compilerOptions from '../../compiler-options';
import { getGlobals } from '../../globals/compiled-global-interface';

export class CompileCommandHandler extends CommandHandlerIterface {
	private sourceDirectory = compilerOptions.rootDir!;

	async execute() {
		const programTypeChecker = this.program.getTypeChecker();
		const sourceFiles = this.program
			.getSourceFiles()
			.filter((sf) => sf.fileName.startsWith(this.sourceDirectory));

		const keywordParser = new KeywordParser(sourceFiles, [], programTypeChecker);
		const compiledGlobals = getGlobals(keywordParser.getClassesAndMethods());

		this.outputMap.set('compiled-globals.d.ts', compiledGlobals);

		return {
			responseCode: CompilerResponseCode.COMPILED as const,
		};
	}
}
