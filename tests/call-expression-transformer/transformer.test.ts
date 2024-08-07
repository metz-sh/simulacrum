import { createProjectSync } from '@ts-morph/bootstrap';
import { readFileSync } from 'fs';
import { KeywordParser } from '../../src/services/typescript/compiler/command-handlers/keyword-parser';
import { removeDecorators } from '../../src/services/typescript/compiler/command-handlers/build-command/transformers/remove-decorators';
import { transformCallExpressions } from '../../src/services/typescript/compiler/command-handlers/build-command/transformers/transform-call-expressions/transform-call-expressions';

const project = createProjectSync({ useInMemoryFileSystem: true }); // or createProjectSync
project.createSourceFile(
	'bundle.ts',
	readFileSync('./tests/call-expression-transformer/bundle.ts').toString()
);
const program = project.createProgram();
const sourceFile = program.getSourceFile('bundle.ts');
if (!sourceFile) {
	throw new Error();
}
const keywords = new KeywordParser([sourceFile as any]).getClassesAndMethods();
const checker = program.getTypeChecker();

describe('Call transformer', () => {
	let output: string;
	test('Bundle should be created', () => {
		program.emit(undefined, undefined, undefined, undefined, {
			before: [removeDecorators(), transformCallExpressions(keywords, checker as any) as any],
		});

		const outputBundle = project.fileSystem.readFileSync('bundle.js');
		expect(outputBundle).toBeDefined();
		output = outputBundle;
	});
});
