import * as ts from 'typescript';
import * as lodash from 'lodash';
import { MethodBodyParser } from './method-body-parser';
import { MethodRuntimeCommands } from '../../../../../runtime/runtime-types';
import { Keywords } from '../../../../compiler-types';
import { CompilerConstants } from '../../../../constants';

export class MethodVisitor {
	private methodBodyParser: MethodBodyParser;
	constructor(
		private readonly className: string,
		private readonly keywords: Keywords,
		private readonly context: ts.TransformationContext,
		private readonly checker: ts.TypeChecker
	) {
		this.methodBodyParser = new MethodBodyParser(checker, keywords, context);
	}

	private createLoadStatements(node: ts.MethodDeclaration) {
		const parameters = ts.factory.createArrayLiteralExpression(
			node.parameters.map((param) => ts.factory.createIdentifier(param.name.getText()))
		);

		const metzContextVariableStatement = ts.factory.createVariableStatement(
			undefined,
			ts.factory.createVariableDeclarationList([
				ts.factory.createVariableDeclaration(
					ts.factory.createIdentifier(CompilerConstants.METZ_CONTEXT_VARIABLE),
					undefined,
					undefined,
					ts.factory.createElementAccessExpression(
						ts.factory.createIdentifier('arguments'),
						ts.factory.createBinaryExpression(
							ts.factory.createPropertyAccessExpression(
								ts.factory.createIdentifier('arguments'),
								ts.factory.createIdentifier('length')
							),
							ts.factory.createToken(ts.SyntaxKind.MinusToken),
							ts.factory.createNumericLiteral('1')
						)
					)
				),
			])
		);

		const loadYieldExpression = ts.factory.createYieldExpression(
			undefined,
			ts.factory.createObjectLiteralExpression([
				ts.factory.createPropertyAssignment(
					ts.factory.createIdentifier('command'),
					ts.factory.createStringLiteral(MethodRuntimeCommands.LOAD)
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
					ts.factory.createStringLiteral(node.name.getText())
				),
				ts.factory.createPropertyAssignment(
					ts.factory.createIdentifier('params'),
					ts.factory.createIdentifier(
						'Array.from(arguments).slice(0, arguments.length-1)'
					)
				),
				ts.factory.createPropertyAssignment(
					ts.factory.createIdentifier('context'),
					ts.factory.createIdentifier(CompilerConstants.METZ_CONTEXT_VARIABLE)
				),
			])
		);

		const loadExpression = ts.factory.createBinaryExpression(
			parameters,
			ts.factory.createToken(ts.SyntaxKind.EqualsToken),
			loadYieldExpression
		);

		return [metzContextVariableStatement, ts.factory.createExpressionStatement(loadExpression)];
	}

	visit(node: ts.Node): ts.VisitResult<ts.Node | undefined> {
		if (ts.isMethodDeclaration(node)) {
			const methodName = (node.name as ts.Identifier).escapedText as string;
			const isMethodMarked = this.keywords
				.find((kw) => kw.className === this.className)
				?.methods.find((m) => m.methodName === methodName)?.flags.isMarked;
			if (!isMethodMarked) {
				if (node.body) {
					const body = ts.factory.createBlock([
						...lodash.flatten(
							this.methodBodyParser.parseForbiddenMethod(
								node.name.getText(),
								node.body
							).statements
						),
					]);

					return ts.factory.updateMethodDeclaration(
						node,
						node.modifiers,
						node.asteriskToken,
						node.name,
						node.questionToken,
						node.typeParameters,
						node.parameters,
						node.type,
						body
					);
				}
				return node;
			}
			const isMethodGenerator = !!node.asteriskToken;
			const isMethodAsync = !!node.modifiers?.find(
				(m) => m.kind === ts.SyntaxKind.AsyncKeyword
			);

			const prefixStatements = [...this.createLoadStatements(node)];
			let body = node.body || ts.factory.createBlock([], true);
			body = ts.factory.updateBlock(body, body.statements);
			const updatedBody = ts.factory.createBlock(
				[
					...prefixStatements,
					...lodash.flatten(this.methodBodyParser.parse(node, body).statements),
				],
				true
			);

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
				ts.factory.createIdentifier((node.name as ts.Identifier).escapedText as string),
				node.questionToken,
				node.typeParameters,
				node.parameters,
				node.type,
				updatedBody
			);
		}

		return ts.visitEachChild(node, (node) => this.visit(node), this.context);
	}
}
