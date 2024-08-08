import * as ts from 'typescript';
import { MethodVisitor } from './method-visitor';
import { pipe } from 'fp-ts/function';
import { Keywords } from '../../../../compiler-types';

function addRuntimeIntegration(node: ts.ClassDeclaration) {
	const statementsThatMustBeOnTop: ts.Statement[] = [];
	const existingConstructorDeclaration = node.members.find((member) =>
		ts.isConstructorDeclaration(member)
	) as ts.ConstructorDeclaration | undefined;
	const isDerived = !!node.heritageClauses?.find(
		(clause) =>
			clause.kind === ts.SyntaxKind.HeritageClause &&
			clause.token === ts.SyntaxKind.ExtendsKeyword
	);

	if (isDerived) {
		statementsThatMustBeOnTop.push(
			ts.factory.createExpressionStatement(
				ts.factory.createCallExpression(ts.factory.createSuper(), undefined, [])
			)
		);
	}

	return ts.factory.updateClassDeclaration(
		node,
		node.modifiers,
		node.name,
		node.typeParameters,
		node.heritageClauses,
		[
			...node.members.filter((member) => !ts.isConstructorDeclaration(member)),
			ts.factory.createConstructorDeclaration(
				undefined,
				existingConstructorDeclaration?.parameters || [],
				ts.factory.createBlock(
					[
						...statementsThatMustBeOnTop,
						ts.factory.createExpressionStatement(
							ts.factory.createCallExpression(
								ts.factory.createPropertyAccessExpression(
									ts.factory.createIdentifier('__runtime'),
									ts.factory.createIdentifier('registerInstance')
								),
								undefined,
								[ts.factory.createThis()]
							)
						),
						...(existingConstructorDeclaration?.body?.statements || []),
					],
					true
				)
			),
		]
	);
}
export function transformCallExpressions(
	keywords: Keywords,
	projectName: string,
	checker: ts.TypeChecker
) {
	const transformerFactory: ts.TransformerFactory<ts.SourceFile> = (context) => {
		return ((sourceFile) => {
			const classvisitor = (node: ts.Node): ts.VisitResult<ts.Node | undefined> => {
				if (ts.isClassDeclaration(node)) {
					const visitableClassNode = pipe(node, addRuntimeIntegration);
					const className = node.name!.escapedText as string;
					const methodVisitor = new MethodVisitor(className, keywords, context, checker);
					return ts.visitNode(visitableClassNode, (node) => {
						return methodVisitor.visit(node);
					});
				}

				return ts.visitEachChild(node, classvisitor, context);
			};

			return ts.visitNode(sourceFile, classvisitor);
		}) as (sourceFile: ts.SourceFile) => ts.SourceFile;
	};

	return transformerFactory;
}
