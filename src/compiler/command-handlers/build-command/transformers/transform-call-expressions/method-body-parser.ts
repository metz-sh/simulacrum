import * as ts from 'typescript';

import { Keywords } from '../../../../compiler-types';
import { CompilerException } from '../../../utils/create-error';
import { CompilerErrorCode } from '../../../../compliler-error-codes';
import parseSymbol from '../../../../utils/parse-symbol';
import { CompilerConstants } from '../../../../constants';
import { MethodRuntimeCommands } from '../../../../../runtime/runtime-types';
import { extractClassAndMethod } from '../../../../utils/extract-class-and-method';

type Destination = {
	isMarked: boolean;
	isDependency: boolean;
};

export class MethodBodyParser {
	constructor(
		private readonly checker: ts.TypeChecker,
		private readonly keywords: Keywords,
		private readonly context: ts.TransformationContext
	) {}

	private getFQNOfCall(node: ts.CallExpression) {
		const type = this.checker.getTypeAtLocation(node.expression);
		const { symbol, isSymbolForbidden } = parseSymbol(type);
		if (isSymbolForbidden) {
			[];
		}
		if (!symbol) {
			if (type.isUnion()) {
				return type.types.map((subtype) => {
					const symbol = subtype.getSymbol();
					let fqn = this.checker.getFullyQualifiedName(symbol!);
					return fqn;
				});
			}
			throw new Error('symbol not found!');
		}
		const fqn = this.checker.getFullyQualifiedName(symbol);
		return [fqn];
	}

	private getDestination(node: ts.CallExpression, fqn: string): Destination | undefined {
		const isDependency = !ts.isExpressionStatement(node.parent);
		const { className: destinationClassName, methodName: destinationMethodName } =
			extractClassAndMethod(fqn);
		const destinationClass = this.keywords.find((kw) => kw.className === destinationClassName);
		if (!destinationClass) {
			return;
		}

		const destinationMethod = destinationClass.methods.find(
			(m) => m.methodName === destinationMethodName
		);
		if (!destinationMethod) {
			return;
		}

		return {
			isMarked: destinationMethod.flags.isMarked,
			isDependency,
		};
	}

	private convertFunctionToAsyncGenerator(
		node:
			| ts.MethodDeclaration
			| ts.FunctionDeclaration
			| ts.FunctionExpression
			| ts.ArrowFunction,
		visitor: (node: ts.Node) => ts.VisitResult<ts.Node>
	): ts.MethodDeclaration | ts.FunctionDeclaration | ts.FunctionExpression | ts.CallExpression {
		const isMethodAsync = !!node.modifiers?.find((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
		const isMethodGenerator = !!node.asteriskToken;

		if (ts.isFunctionDeclaration(node)) {
			return ts.factory.updateFunctionDeclaration(
				node,
				isMethodAsync
					? node.modifiers
					: [
							...(node.modifiers || []),
							ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword),
						],
				isMethodGenerator
					? node.asteriskToken
					: ts.factory.createToken(ts.SyntaxKind.AsteriskToken),
				node.name,
				node.typeParameters,
				node.parameters,
				node.type,
				ts.visitNode(node.body, visitor) as ts.Block
			);
		}

		if (ts.isArrowFunction(node)) {
			const block = (() => {
				if (ts.isBlock(node.body)) {
					return node.body;
				}
				return ts.factory.createBlock([ts.factory.createReturnStatement(node.body)]);
			})();
			return ts.factory.createCallExpression(
				ts.factory.createPropertyAccessExpression(
					ts.factory.createParenthesizedExpression(
						ts.factory.createFunctionExpression(
							isMethodAsync
								? node.modifiers
								: [
										...(node.modifiers || []),
										ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword),
									],
							isMethodGenerator
								? node.asteriskToken
								: ts.factory.createToken(ts.SyntaxKind.AsteriskToken),
							node.name,
							node.typeParameters,
							node.parameters,
							node.type,
							ts.visitNode(block, visitor) as ts.Block
						)
					),
					ts.factory.createIdentifier('bind')
				),
				undefined,
				[ts.factory.createThis()]
			);
		}

		if (ts.isFunctionExpression(node)) {
			return ts.factory.updateFunctionExpression(
				node,
				isMethodAsync
					? node.modifiers
					: [
							...(node.modifiers || []),
							ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword),
						],
				isMethodGenerator
					? node.asteriskToken
					: ts.factory.createToken(ts.SyntaxKind.AsteriskToken),
				node.name,
				node.typeParameters,
				node.parameters,
				node.type,
				ts.visitNode(node.body, visitor) as ts.Block
			);
		}

		if (ts.isMethodDeclaration(node)) {
			return ts.factory.updateMethodDeclaration(
				node,
				isMethodAsync
					? node.modifiers
					: [
							...(node.modifiers || []),
							ts.factory.createModifier(ts.SyntaxKind.AsyncKeyword),
						],
				isMethodGenerator
					? node.asteriskToken
					: ts.factory.createToken(ts.SyntaxKind.AsteriskToken),
				node.name,
				node.questionToken,
				node.typeParameters,
				node.parameters,
				node.type,
				ts.visitNode(node.body, visitor) as ts.Block
			);
		}

		console.error('unknown node', node);
		throw new Error('Unknown node passed!');
	}
	private createSimpleIFFE(statements: ts.Statement[]) {
		const functionExpression = ts.factory.createFunctionExpression(
			[],
			ts.factory.createToken(ts.SyntaxKind.AsteriskToken),
			undefined,
			undefined,
			[],
			undefined,
			ts.factory.createBlock(statements, true)
		);

		const boundFunction = ts.factory.createCallExpression(
			ts.factory.createPropertyAccessExpression(
				ts.factory.createParenthesizedExpression(functionExpression),
				ts.factory.createIdentifier('bind')
			),
			undefined,
			[ts.factory.createThis()]
		);
		return ts.factory.createBinaryExpression(
			ts.factory.createIdentifier('yield'),
			ts.factory.createToken(ts.SyntaxKind.AsteriskToken),
			ts.factory.createCallExpression(
				ts.factory.createParenthesizedExpression(boundFunction),
				undefined,
				[]
			)
		);
	}

	private getDeclarationOfCall(node: ts.CallExpression) {
		const signature = this.checker.getResolvedSignature(node);
		if (!signature) {
			return;
		}
		const { declaration } = signature;
		if (!declaration) {
			return;
		}

		return declaration;
	}

	private parseMethodCallExpression(
		methodName: string,
		node: ts.CallExpression,
		isDependency: boolean,
		visitor: (node: ts.Node) => ts.VisitResult<ts.Node>,
		addCallerAddress = false
	) {
		const addressProperties = [
			ts.factory.createPropertyAssignment(
				ts.factory.createIdentifier('startingAddress'),
				ts.factory.createPropertyAccessExpression(
					ts.factory.createThis(),
					ts.factory.createIdentifier('__starting_address')
				)
			),
			ts.factory.createPropertyAssignment(
				ts.factory.createIdentifier('offset'),
				ts.factory.createStringLiteral(methodName)
			),
		];
		const expression = ts.factory.createBinaryExpression(
			ts.factory.createIdentifier('yield'),
			ts.factory.createToken(ts.SyntaxKind.AsteriskToken),
			ts.factory.updateCallExpression(node, node.expression, node.typeArguments, [
				...node.arguments.map((expression) => ts.visitNode(expression, visitor)),
				ts.factory.createObjectLiteralExpression(
					[
						ts.factory.createPropertyAssignment(
							ts.factory.createIdentifier('isDependency'),
							isDependency ? ts.factory.createTrue() : ts.factory.createFalse()
						),
						ts.factory.createPropertyAssignment(
							ts.factory.createIdentifier('flowId'),
							ts.factory.createIdentifier(
								`${CompilerConstants.METZ_CONTEXT_VARIABLE}.flowId`
							)
						),
						...(addCallerAddress ? addressProperties : []),
					],
					false
				),
			] as ts.Expression[])
		);

		return ts.factory.createParenthesizedExpression(expression);
	}

	private handleFunctionBody(
		node:
			| ts.MethodDeclaration
			| ts.FunctionDeclaration
			| ts.FunctionExpression
			| ts.ArrowFunction,
		visitor: (node: ts.Node) => ts.VisitResult<ts.Node>
	) {
		if (ts.isCallExpression(node.parent)) {
			const isFunctionCallUnderOurPurview = (() => {
				const declaration = this.getDeclarationOfCall(node.parent);
				if (!declaration) {
					return false;
				}

				return (
					ts.isMethodDeclaration(declaration) ||
					ts.isFunctionDeclaration(declaration) ||
					ts.isFunctionExpression(declaration) ||
					ts.isArrowFunction(declaration) ||
					ts.isFunctionTypeNode(declaration)
				);
			})();
			if (!isFunctionCallUnderOurPurview) {
				return {
					node,
				};
			}
		}
		const asyncGenNode = this.convertFunctionToAsyncGenerator(node, visitor);
		return {
			node: asyncGenNode,
		};
	}

	private createUnloadStatement(
		methodName: string,
		returnStatement: ts.ReturnStatement,
		visitor: (node: ts.Node) => ts.VisitResult<ts.Node>
	) {
		const loadYieldExpression = ts.factory.createYieldExpression(
			undefined,
			ts.factory.createObjectLiteralExpression(
				[
					ts.factory.createPropertyAssignment(
						ts.factory.createIdentifier('command'),
						ts.factory.createStringLiteral(MethodRuntimeCommands.UNLOAD)
					),
					ts.factory.createPropertyAssignment(
						ts.factory.createIdentifier('startingAddress'),
						ts.factory.createPropertyAccessExpression(
							ts.factory.createThis(),
							ts.factory.createIdentifier('__starting_address')
						)
					),
					ts.factory.createPropertyAssignment(
						ts.factory.createIdentifier('offset'),
						ts.factory.createStringLiteral(methodName)
					),
					ts.factory.createPropertyAssignment(
						ts.factory.createIdentifier('returnValue'),
						returnStatement.expression
							? (ts.visitNode(returnStatement.expression, visitor) as ts.Expression)
							: ts.factory.createIdentifier('undefined')
					),
				],
				false
			)
		);

		return ts.factory.createReturnStatement(loadYieldExpression);
	}

	private createHaltLoop(node: ts.CallExpression, methodName: string) {
		const haltedFor = node.arguments[0].getText();
		const forStatement = ts.factory.createForStatement(
			ts.factory.createVariableDeclarationList(
				[
					ts.factory.createVariableDeclaration(
						ts.factory.createIdentifier('index'),
						undefined,
						undefined,
						ts.factory.createNumericLiteral('1')
					),
				],
				ts.NodeFlags.Let |
					ts.NodeFlags.YieldContext |
					ts.NodeFlags.ContextFlags |
					ts.NodeFlags.TypeExcludesFlags
			),
			ts.factory.createBinaryExpression(
				ts.factory.createIdentifier('index'),
				ts.factory.createToken(ts.SyntaxKind.LessThanEqualsToken),
				ts.factory.createIdentifier(haltedFor)
			),
			ts.factory.createPostfixUnaryExpression(
				ts.factory.createIdentifier('index'),
				ts.SyntaxKind.PlusPlusToken
			),
			ts.factory.createBlock(
				[
					ts.factory.createExpressionStatement(
						ts.factory.createYieldExpression(
							undefined,
							ts.factory.createObjectLiteralExpression(
								[
									ts.factory.createPropertyAssignment(
										ts.factory.createIdentifier('command'),
										ts.factory.createStringLiteral(MethodRuntimeCommands.HALT)
									),
									ts.factory.createPropertyAssignment(
										ts.factory.createIdentifier('startingAddress'),
										ts.factory.createPropertyAccessExpression(
											ts.factory.createThis(),
											ts.factory.createIdentifier('__starting_address')
										)
									),
									ts.factory.createPropertyAssignment(
										ts.factory.createIdentifier('offset'),
										ts.factory.createStringLiteral(methodName)
									),
									ts.factory.createPropertyAssignment(
										ts.factory.createIdentifier('coveredHalts'),
										ts.factory.createIdentifier('index')
									),
									ts.factory.createPropertyAssignment(
										ts.factory.createIdentifier('haltedFor'),
										ts.factory.createNumericLiteral(haltedFor)
									),
								],
								false
							)
						)
					),
				],
				true
			)
		);
		const iffe = this.createSimpleIFFE([forStatement]);

		return iffe;
	}

	private createLogStatement(
		methodName: string,
		node: ts.CallExpression,
		visitor: (node: ts.Node) => ts.VisitResult<ts.Node>
	) {
		const loadYieldExpression = ts.factory.createYieldExpression(
			undefined,
			ts.factory.createObjectLiteralExpression(
				[
					ts.factory.createPropertyAssignment(
						ts.factory.createIdentifier('command'),
						ts.factory.createStringLiteral(MethodRuntimeCommands.LOG)
					),
					ts.factory.createPropertyAssignment(
						ts.factory.createIdentifier('startingAddress'),
						ts.factory.createPropertyAccessExpression(
							ts.factory.createThis(),
							ts.factory.createIdentifier('__starting_address')
						)
					),
					ts.factory.createPropertyAssignment(
						ts.factory.createIdentifier('offset'),
						ts.factory.createStringLiteral(methodName)
					),
					ts.factory.createPropertyAssignment(
						ts.factory.createIdentifier('logs'),
						ts.factory.createArrayLiteralExpression(
							node.arguments.map((expression) =>
								ts.visitNode(expression, visitor)
							) as ts.Expression[]
						)
					),
				],
				false
			)
		);

		return loadYieldExpression;
	}

	private getVisitor(method: ts.MethodDeclaration) {
		const methodName = method.name.getText();
		const visitor: (node: ts.Node) => ts.VisitResult<ts.Node> = (node: ts.Node) => {
			const isFunction =
				ts.isMethodDeclaration(node) ||
				ts.isFunctionDeclaration(node) ||
				ts.isFunctionExpression(node) ||
				ts.isArrowFunction(node);

			if (isFunction) {
				const { node: parsedNode } = this.handleFunctionBody(node, visitor);
				return parsedNode;
			}

			if (ts.isCallExpression(node)) {
				const fqns = this.getFQNOfCall(node);
				if (fqns.length === 1) {
					const [fqn] = fqns;
					if (fqn === 'std.log') {
						return this.createLogStatement(methodName, node, visitor);
					}
					if (fqn === 'std.sleep') {
						return this.createHaltLoop(node, methodName);
					}
					if (
						fqn === 'std.FlowExecutor.await' ||
						fqn === 'std.awaitAll' ||
						fqn === 'std.awaitRace'
					) {
						const isDependency = !ts.isExpressionStatement(node.parent);
						return this.parseMethodCallExpression(
							methodName,
							node,
							isDependency,
							visitor,
							true
						);
					}
					const nodeString = node.getText();
					if (fqn.startsWith('std.') || nodeString.startsWith('std.')) {
						return node;
					}
				}
				const destinations = fqns
					.map((fqn) => this.getDestination(node, fqn))
					.filter((_) => !!_) as Destination[];
				if (destinations.length) {
					if (destinations.every((destination) => destination.isMarked)) {
						return this.parseMethodCallExpression(
							methodName,
							node,
							destinations.every((destination) => destination.isDependency),
							visitor
						);
					} else if (destinations.every((destination) => !destination.isMarked)) {
						return node;
					} else {
						throw new CompilerException(
							`Illegal Access! The call signature suggests it returns a union type and it's union of public and private methods.`
						).set('code', CompilerErrorCode.UNKNOWN);
					}
				}

				const type = this.checker.getTypeAtLocation(node.expression);
				const { isSymbolForbidden } = parseSymbol(type);
				if (isSymbolForbidden) {
					return node;
				}

				// If we reach here it means, we are working with a call expression that is beyond user created classes.
				// So, we figure out if need to operate on it or not. If it's a library call, then we leave it.
				// If it's a call whose declaration is under our purview then we operate.
				const isFunctionCallUnderOurPurview = (() => {
					const declaration = this.getDeclarationOfCall(node);
					if (!declaration) {
						return false;
					}

					return (
						ts.isFunctionDeclaration(declaration) ||
						ts.isFunctionExpression(declaration) ||
						ts.isArrowFunction(declaration) ||
						ts.isFunctionTypeNode(declaration)
					);
				})();

				if (isFunctionCallUnderOurPurview) {
					return ts.factory.createParenthesizedExpression(
						ts.factory.createBinaryExpression(
							ts.factory.createIdentifier('yield'),
							ts.factory.createToken(ts.SyntaxKind.AsteriskToken),
							ts.visitEachChild(node, visitor, this.context)
						)
					);
				}

				return ts.visitEachChild(node, visitor, this.context);
			}

			// When handling return statement, we have to be careful that the return statement
			// is actually for the method and not anything else.
			// Here we first filter on if the node has a parent or not, because synthetic nodes won't.
			// Next we make sure that the node's parent is not a function like construct.
			if (
				ts.isReturnStatement(node) &&
				node.parent &&
				!ts.findAncestor(node, ts.isFunctionDeclaration) &&
				!ts.findAncestor(node, ts.isFunctionExpression) &&
				!ts.findAncestor(node, ts.isArrowFunction) &&
				!ts.findAncestor(node, ts.isFunctionTypeNode) &&
				ts.findAncestor(node, ts.isMethodDeclaration) === method
			) {
				return this.createUnloadStatement(methodName, node, visitor);
			}

			return ts.visitEachChild(node, visitor, this.context);
		};

		return visitor;
	}

	private getForbiddenMethodVisitor(name: string) {
		const visitor: (node: ts.Node) => ts.VisitResult<ts.Node> = (node: ts.Node) => {
			if (ts.isCallExpression(node)) {
				return node;
			}

			return ts.visitEachChild(node, visitor, this.context);
		};

		return visitor;
	}

	parse(method: ts.MethodDeclaration, body: ts.Block) {
		const visitor = this.getVisitor(method);
		const transformedBlock = ts.visitNode(body, visitor) as ts.Block;

		const suffixStatements: (ts.ExpressionStatement | ts.ReturnStatement)[] = [];
		if (transformedBlock.statements.slice(-1)[0]?.kind !== ts.SyntaxKind.ReturnStatement) {
			suffixStatements.push(
				this.createUnloadStatement(
					method.name.getText(),
					ts.factory.createReturnStatement(),
					visitor
				)
			);
		}

		return ts.factory.updateBlock(transformedBlock, [
			...transformedBlock.statements,
			...suffixStatements,
		]);
	}

	parseForbiddenMethod(name: string, body: ts.Block) {
		return ts.visitNode(body, this.getForbiddenMethodVisitor(name)) as ts.Block;
	}
}
