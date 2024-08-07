import * as ts from 'typescript';

export function createTransformerFactory(transformer: (node: ts.Node) => ts.Node | undefined) {
	const transformerFactory: ts.TransformerFactory<ts.SourceFile> = (context) => {
		return ((sourceFile) => {
			const visitor = (node: ts.Node): ts.Node | undefined => {
				const transformedNode = transformer(node);
				return transformedNode;

				return ts.visitEachChild(node, visitor, context);
			};

			return ts.visitNode(sourceFile, visitor);
		}) as (sourceFile: ts.SourceFile) => ts.SourceFile;
	};

	return transformerFactory;
}
