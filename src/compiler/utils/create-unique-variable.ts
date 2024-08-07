import type * as ts from 'typescript';

function getStringFromNumber(num: number) {
	const stringNumber = String(num);
	let result = ``;
	for (const char of stringNumber) {
		result += `${String.fromCharCode(97 + Number(char))}`;
	}

	return result;
}

export function createUniqueVariableNameFromCallExpression(node: ts.Node) {
	const identifier = node;
	return `${getStringFromNumber(identifier.pos)}_${getStringFromNumber(identifier.end)}`;
}
