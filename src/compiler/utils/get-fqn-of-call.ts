import ts from 'typescript';
import parseSymbol from './parse-symbol';

export function getFQNsOfCall(node: ts.Expression, checker: ts.TypeChecker): string[] {
	const type = checker.getTypeAtLocation(node);
	const { symbol, isSymbolForbidden } = parseSymbol(type);
	if (isSymbolForbidden) {
		[];
	}
	if (!symbol) {
		if (type.isUnion()) {
			return type.types
				.map((subtype) => {
					const symbol = subtype.getSymbol();
					if (!symbol) {
						return;
					}
					let fqn = checker.getFullyQualifiedName(symbol);
					return fqn;
				})
				.filter((_) => !!_) as string[];
		}
		return [];
	}
	const fqn = checker.getFullyQualifiedName(symbol);
	return [fqn];
}
