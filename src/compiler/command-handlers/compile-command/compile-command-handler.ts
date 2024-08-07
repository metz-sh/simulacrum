import * as lodash from 'lodash';
import { CompilerResponseCode } from '../../compiler-types';
import { CommandHandlerIterface } from '../command-handler.interface';
import { KeywordParser } from '../utils/keyword-parser/keyword-parser';
import compilerOptions from '../../compiler-options';
import { getGlobals } from '../../globals/compiled-global-interface';

export class CompileCommandHandler extends CommandHandlerIterface {
	private sourceDirectory = compilerOptions.rootDir!;

	private getClassNames() {
		const programTypeChecker = this.program.getTypeChecker();
		const sourceFiles = this.program
			.getSourceFiles()
			.filter((sf) => sf.fileName.startsWith(this.sourceDirectory));
		const keywordParser = new KeywordParser(sourceFiles, [], programTypeChecker);
		const [constructorBased, injectables] = lodash.partition(
			keywordParser.getClassesAndMethods(),
			(_) => _.flags.isConstructorBased
		);
		return {
			constructorBased: constructorBased.map((_) => _.className),
			injectables: injectables.map((_) => _.className),
		};
	}

	async execute() {
		const { constructorBased, injectables } = this.getClassNames();
		const compiledGlobals = getGlobals({
			constructorBased,
			injectableClassNames: injectables,
		});

		this.outputMap.set('compiled-globals.d.ts', compiledGlobals);

		return {
			responseCode: CompilerResponseCode.COMPILED as const,
		};
	}
}
