import type * as ts from 'typescript';

export function getErrorPosition(params: { sourceFile: ts.SourceFile; node: ts.Node }) {
	const { line: startLine, character: startCharacter } =
		params.sourceFile.getLineAndCharacterOfPosition(params.node.getStart());
	const { line: endLine, character: endCharacter } =
		params.sourceFile.getLineAndCharacterOfPosition(params.node.getEnd());

	const position = {
		startLine: startLine + 1,
		startCharacter: startCharacter + 1,
		endLine: endLine + 1,
		endCharacter: endCharacter + 1,
	};

	return position;
}
