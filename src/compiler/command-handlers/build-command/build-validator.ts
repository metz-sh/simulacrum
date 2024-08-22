import * as ts from 'typescript';
import { CompilerErrors } from '../../compiler-types';
import { CompilerErrorCode } from '../../compliler-error-codes';
import { getErrorPosition } from '../utils/get-error-position';
import { Keywords } from '../../compiler-types';
import { getFQNsOfCall } from '../../utils/get-fqn-of-call';
import { isFqnMarked } from '../../utils/is-fqn-marked';

export class BuildValidator {
	sourceFiles: readonly ts.SourceFile[];
	constructor(
		sourceFiles: readonly ts.SourceFile[],
		private checker: ts.TypeChecker
	) {
		this.sourceFiles = sourceFiles.filter((sf) => !sf.fileName.endsWith('.d.ts'));
	}

	validateBeforeParsing() {
		const codeSourceFiles = this.sourceFiles;
		const errors = [
			...this.validateTopLevel(codeSourceFiles),
			...this.noSuperAllowed(codeSourceFiles),
		];

		if (errors.length) {
			return errors;
		}
	}

	validateAfterParsing(params: { keywords: Keywords }) {
		const codeSourceFiles = this.sourceFiles;
		const errors = [
			...this.noWeirdConstructingAllowed(codeSourceFiles, params.keywords),
			...this.noUsageOfMarkedMethodsInForeignFunctions(codeSourceFiles, params.keywords),
		];

		if (errors.length) {
			return errors;
		}
	}

	private validateTopLevel(sourceFiles: readonly ts.SourceFile[]): CompilerErrors {
		const errors: CompilerErrors = [];

		for (const sourceFile of sourceFiles) {
			sourceFile.statements.forEach((node) => {
				const isNodeAcceptable =
					ts.isClassDeclaration(node) ||
					ts.isTypeAliasDeclaration(node) ||
					ts.isEnumDeclaration(node) ||
					ts.isInterfaceDeclaration(node);
				if (!isNodeAcceptable) {
					errors.push({
						sourceable: true,
						fileName: sourceFile.fileName,
						message:
							'The file should only have a class/interface/enum/type at top level',
						position: getErrorPosition({
							sourceFile,
							node,
						}),
					});
					return;
				}
				const isExported = this.isNodeExported(node);
				if (isExported) {
					errors.push({
						sourceable: true,
						fileName: sourceFile.fileName,
						message: '"export" is disabled',
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

	private isClassDeclarationConstructorBased(
		node: ts.ClassLikeDeclaration,
		constructorBasedClasses: Keywords
	) {
		if (!node.name) {
			return false;
		}
		const isConstructorBased = constructorBasedClasses
			.map((kw) => kw.className)
			.includes(node.name.getText());

		return isConstructorBased;
	}

	private noWeirdConstructingAllowed(
		sourceFiles: readonly ts.SourceFile[],
		keywords: Keywords
	): CompilerErrors {
		const errors: CompilerErrors = [];
		const constructorBasedClasses = keywords.filter((kw) => kw.flags.isConstructorBased);
		for (const sourceFile of sourceFiles) {
			const visitor = (node: ts.Node) => {
				if (ts.isConstructorDeclaration(node)) {
					if (
						this.isClassDeclarationConstructorBased(
							node.parent,
							constructorBasedClasses
						)
					) {
						if (node.body) {
							ts.forEachChild(node.body, visitor);
						}
						return;
					} else {
						if (node.parameters.length) {
							const argumentsWithNoInitializer = node.parameters.filter(
								(p) => !p.initializer
							);
							if (!argumentsWithNoInitializer.length) {
								return;
							}
							const stringifiedArgumentsWithNoInitializer = argumentsWithNoInitializer
								.map((a) => `'${a.name.getText()}'`)
								.join(',');
							errors.push({
								sourceable: true,
								fileName: sourceFile.fileName,
								message: `Constructors with unintialized arguments not allowed for @Injectable classes.\nPlease add initializers for: ${stringifiedArgumentsWithNoInitializer} `,
								highlights: [stringifiedArgumentsWithNoInitializer],
								position: getErrorPosition({
									sourceFile,
									node,
								}),
								code: CompilerErrorCode.UNINITIALIZED_ARGUMENTS_PROVIDED_FOR_INJECTABLE_CONSTRUCTOR,
							});
							return;
						}
						if (node.body) {
							ts.forEachChild(node.body, visitor);
						}
					}
				}

				ts.forEachChild(node, visitor);
			};

			ts.forEachChild(sourceFile, visitor);
		}

		return errors;
	}

	private noUsageOfMarkedMethodsInForeignFunctions(
		sourceFiles: readonly ts.SourceFile[],
		keywords: Keywords
	) {
		const errors: CompilerErrors = [];
		for (const sourceFile of sourceFiles) {
			const visitor = (node: ts.Node) => {
				if (ts.isCallExpression(node)) {
					node.arguments.forEach((arg) => {
						this.collectErrorsFromCallExpressionArgument(
							arg,
							keywords,
							sourceFile,
							errors
						);
					});
				}
				ts.forEachChild(node, visitor);
			};

			ts.forEachChild(sourceFile, visitor);
		}

		return errors;
	}

	private collectErrorsFromCallExpressionArgument(
		expression: ts.Expression,
		keywords: Keywords,
		sourceFile: ts.SourceFile,
		errors: CompilerErrors
	) {
		const callVisitor = (node: ts.Node) => {
			if (ts.isExpression(node)) {
				const symbol = this.checker.getSymbolAtLocation(node);
				const fqns = getFQNsOfCall(node, this.checker);
				for (const fqn of fqns) {
					if (symbol && isFqnMarked(fqn, keywords)) {
						errors.push({
							sourceable: true,
							fileName: sourceFile.fileName,
							message: `A class method is being used inside a function call that's outside the runtime's purview. This will cause undefined behaviour.`,
							position: getErrorPosition({
								sourceFile,
								node,
							}),
							code: CompilerErrorCode.METHOD_CALL_INSIDE_FUNCTION,
						});
					}
				}
			}
			ts.forEachChild(node, callVisitor);
		};

		ts.forEachChild(expression, callVisitor);
	}

	private noSuperAllowed(sourceFiles: readonly ts.SourceFile[]): CompilerErrors {
		const errors: CompilerErrors = [];

		for (const sourceFile of sourceFiles) {
			const visitor = (node: ts.Node) => {
				if (node.kind === ts.SyntaxKind.SuperKeyword) {
					errors.push({
						sourceable: true,
						fileName: sourceFile.fileName,
						message: 'Using super is not allowed!',
						position: getErrorPosition({
							sourceFile,
							node,
						}),
						code: CompilerErrorCode.NO_SUPER,
					});
					return;
				}

				ts.forEachChild(node, visitor);
			};

			ts.forEachChild(sourceFile, visitor);
		}

		return errors;
	}

	private isNodeExported(node: ts.Node): boolean {
		return (
			(ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) ===
				ts.ModifierFlags.Export ||
			(ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) ===
				ts.ModifierFlags.ExportDefault
		);
	}
}
