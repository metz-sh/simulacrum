import ts from 'typescript';
import { getErrorPosition } from '../../../compiler/command-handlers/utils/get-error-position';
import { CompilerErrors } from '../../../compiler/compiler-types';

export class ScriptValidator {
	constructor(private readonly sourceFiles: readonly ts.SourceFile[]) {}

	validateBeforeParsing() {
		const codeSourceFiles = this.sourceFiles;
		const errors = [...this.validateTopLevel(codeSourceFiles)];

		if (errors.length) {
			return errors;
		}
	}

	private validateTopLevel(sourceFiles: readonly ts.SourceFile[]): CompilerErrors {
		const errors: CompilerErrors = [];

		for (const sourceFile of sourceFiles) {
			sourceFile.statements.forEach((node) => {
				const isNodeAcceptable =
					node.kind === ts.SyntaxKind.ExpressionStatement ||
					node.kind === ts.SyntaxKind.VariableStatement;
				if (!isNodeAcceptable) {
					errors.push({
						sourceable: true,
						fileName: sourceFile.fileName,
						message: 'Story script should only have expressions at top level!',
						position: getErrorPosition({
							sourceFile,
							node,
						}),
					});
					return;
				}
			});
		}

		return errors;
	}
}
