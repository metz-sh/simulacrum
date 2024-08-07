import * as ts from 'typescript';

export function removeDecorators() {
	const transformerFactory: ts.TransformerFactory<ts.SourceFile> = (context) => {
		return ((sourceFile) => {
			const visitor = (node: ts.Node): ts.VisitResult<ts.Node | undefined> => {
				if (ts.isDecorator(node)) {
					return undefined;
				}

				return ts.visitEachChild(node, visitor, context);
			};

			return ts.visitNode(sourceFile, visitor);
		}) as (sourceFile: ts.SourceFile) => ts.SourceFile;
	};

	return transformerFactory;
}
