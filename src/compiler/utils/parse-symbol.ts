const forbiddenSymbols = ['MetzFlowFunction'];

import type * as ts from 'typescript';
export default function parseSymbol(type: ts.Type) {
	const symbol = type.getSymbol() || type.aliasSymbol;
	if (!symbol) {
		return {
			symbol: undefined,
		} as const;
	}

	const name = symbol.escapedName.toString();
	const isForbidden = forbiddenSymbols.includes(name);

	return {
		symbol,
		isSymbolForbidden: isForbidden,
	} as const;
}
