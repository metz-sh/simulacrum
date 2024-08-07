import * as ts from 'typescript';
import { Keyword } from '../../../compiler-types';

abstract class CreateClassFlags {
	constructor(readonly decorator: ts.Decorator) {}
	abstract getClassFlags(): Partial<Keyword['flags']>;
}

export class InjectableDecorator extends CreateClassFlags {
	getClassFlags() {
		return {
			isConstructorBased: false,
		};
	}
}

export class TableDecorator extends CreateClassFlags {
	getClassFlags() {
		const rawColumns = (this.decorator.expression as ts.CallExpression)
			.arguments[0] as ts.ArrayLiteralExpression;
		const columns = rawColumns.elements.map((e) => (e as ts.StringLiteral).text);

		return {
			view: {
				type: 'table' as const,
				columns,
			},
			collapsed: true,
		};
	}
}

export class CollectionDecorator extends CreateClassFlags {
	getClassFlags() {
		return {
			view: {
				type: 'collection' as const,
			},
			collapsed: true,
		};
	}
}

export class KeyValueDecorator extends CreateClassFlags {
	getClassFlags() {
		return {
			view: {
				type: 'keyvalue' as const,
			},
			collapsed: true,
		};
	}
}

export class ShowDecorator {
	constructor(readonly decorator: ts.Decorator) {}
}

export function parseClassDecorator(decorator: ts.Decorator) {
	if (ts.isCallExpression(decorator.expression)) {
		const name = (decorator.expression.expression as ts.Identifier).text;
		if (name === 'Table') {
			return new TableDecorator(decorator);
		}

		return;
	}

	const name = (decorator.expression as ts.Identifier).text;
	if (name === 'Injectable') {
		return new InjectableDecorator(decorator);
	}
	if (name === 'Collection') {
		return new CollectionDecorator(decorator);
	}
	if (name === 'KeyValue') {
		return new KeyValueDecorator(decorator);
	}
}

export function parseMethodDecorator(decorator: ts.Decorator) {
	const name = (decorator.expression as ts.Identifier).text;
	if (name === 'Show') {
		return new ShowDecorator(decorator);
	}
}
