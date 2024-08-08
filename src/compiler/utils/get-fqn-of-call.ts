import ts from 'typescript';
import parseSymbol from './parse-symbol';

export function getFQNsOfCall(node: ts.CallExpression, checker: ts.TypeChecker) {
	const type = checker.getTypeAtLocation(node.expression);
	const { symbol, isSymbolForbidden } = parseSymbol(type);
	if (isSymbolForbidden) {
		[];
	}
	if (!symbol) {
		if (type.isUnion()) {
			return type.types.map((subtype) => {
				const symbol = subtype.getSymbol();
				let fqn = checker.getFullyQualifiedName(symbol!);
				return fqn;
			});
		}
		return [];
	}
	const fqn = checker.getFullyQualifiedName(symbol);
	return [fqn];
}
