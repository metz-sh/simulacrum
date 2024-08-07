import * as ts from 'typescript';
import { CompilerErrorCode } from '../../compliler-error-codes';
import { getErrorPosition } from './get-error-position';

export class CompilerException {
	public code?: CompilerErrorCode = CompilerErrorCode.UNKNOWN;
	public sourceable = false;
	fileName?: string;
	position?: {
		startLine: number;
		startCharacter: number;
		endLine: number;
		endCharacter: number;
	};

	public highlights: string[] = [];

	constructor(readonly message: string) {}

	set<T extends keyof this>(key: T, value: this[T]) {
		this[key] = value;
		return this;
	}

	addHighlights(highlights: string[]) {
		this.highlights.push(...highlights);
		return this;
	}

	addSource(params: { sourceFile: ts.SourceFile; node: ts.Node }) {
		this.sourceable = true;
		this.fileName = params.sourceFile.fileName;
		this.position = getErrorPosition(params);

		return this;
	}
}
