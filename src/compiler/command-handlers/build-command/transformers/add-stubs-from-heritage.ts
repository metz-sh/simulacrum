import * as ts from 'typescript';
import * as lodash from 'lodash';

function getPublicMethodDeclarationsFromHierarchy(
	node: ts.ClassDeclaration,
	checker: ts.TypeChecker,
	result: ts.MethodDeclaration[] = []
) {
	if (!node.heritageClauses?.length) {
		return result;
	}

	const extendedClause = node.heritageClauses.find(
		(clause) => clause.token === ts.SyntaxKind.ExtendsKeyword
	);
	if (!extendedClause) {
		return result;
	}

	const parentClassReference = extendedClause.types[0];
	const identifier = parentClassReference.expression;
	const symbol = checker.getSymbolAtLocation(identifier);

	const parentClassMembers = symbol?.members;
	if (!parentClassMembers) {
		return result;
	}

	const parentClass = symbol.valueDeclaration as ts.ClassDeclaration | undefined;
	if (!parentClass) {
		return result;
	}

	const parentClassMethods = parentClass.members.filter(
		(member) => member.kind === ts.SyntaxKind.MethodDeclaration
	) as ts.MethodDeclaration[];

	const publicParentClassMethods = parentClassMethods.filter((method) => {
		const modifiers = ts.getModifiers(method);
		if (!modifiers) {
			return true;
		}
		const isAbstract = modifiers?.find(
			(modifer) => modifer.kind === ts.SyntaxKind.AbstractKeyword
		);

		if (isAbstract) {
			return false;
		}

		const isPublic = modifiers.every(
			(modifier) =>
				modifier.kind !== ts.SyntaxKind.PrivateKeyword &&
				modifier.kind !== ts.SyntaxKind.ProtectedKeyword
		);

		return isPublic;
	});

	result.push(...publicParentClassMethods);

	return getPublicMethodDeclarationsFromHierarchy(parentClass, checker, result);
}

function getInheritedStubMethodDeclaration(parentMethodDeclaration: ts.MethodDeclaration) {
	const methodDeclaration = ts.factory.createMethodDeclaration(
		parentMethodDeclaration.modifiers,
		parentMethodDeclaration.asteriskToken,
		parentMethodDeclaration.name,
		parentMethodDeclaration.questionToken,
		parentMethodDeclaration.typeParameters,
		parentMethodDeclaration.parameters,
		parentMethodDeclaration.type,
		parentMethodDeclaration.body
	);

	return methodDeclaration;
}

function isClassAParent(node: ts.ClassDeclaration, sourceFile: ts.SourceFile): boolean {
	// Ensure the node is a class declaration
	if (!node.name) return false;

	const className = node.name.text;
	let isParent = false;

	// Function to check if the current node's heritage clause contains the class name
	const checkHeritageClause = (node: ts.Node) => {
		if (ts.isClassDeclaration(node) && node.heritageClauses) {
			for (const heritageClause of node.heritageClauses) {
				for (const type of heritageClause.types) {
					if (ts.isIdentifier(type.expression) && type.expression.text === className) {
						isParent = true;
					}
				}
			}
		}
		node.forEachChild(checkHeritageClause);
	};

	// Start traversing the AST from the root of the source file
	sourceFile.forEachChild(checkHeritageClause);

	return isParent;
}

export default function (
	checker: ts.TypeChecker,
	resultContainer: { parentClasses: ts.ClassDeclaration[] }
) {
	const transformerFactory: ts.TransformerFactory<ts.SourceFile> = (context) => {
		return ((sourceFile) => {
			const classvisitor = (node: ts.Node): ts.VisitResult<ts.Node | undefined> => {
				if (ts.isClassDeclaration(node) && !isClassAParent(node, sourceFile)) {
					const publicMethodsFromHierarchy = getPublicMethodDeclarationsFromHierarchy(
						node,
						checker
					);
					const parentClasses = publicMethodsFromHierarchy.map(
						(method) => method.parent as ts.ClassDeclaration
					);
					resultContainer.parentClasses.push(...parentClasses);

					const publicMethodsNotImplemented = lodash.uniqBy(
						lodash.differenceBy(
							publicMethodsFromHierarchy,
							node.members.filter(
								(member) => member.kind === ts.SyntaxKind.MethodDeclaration
							) as ts.MethodDeclaration[],
							(method) => method.name.getText()
						),
						(method) => method.name.getText()
					);

					const methodDeclarationsToAdd = publicMethodsNotImplemented.map(
						getInheritedStubMethodDeclaration
					);

					return ts.factory.updateClassDeclaration(
						node,
						node.modifiers,
						node.name,
						node.typeParameters,
						node.heritageClauses,
						[...node.members, ...methodDeclarationsToAdd]
					);
				}

				return ts.visitEachChild(node, classvisitor, context);
			};

			return ts.visitNode(sourceFile, classvisitor);
		}) as (sourceFile: ts.SourceFile) => ts.SourceFile;
	};

	return transformerFactory;
}
