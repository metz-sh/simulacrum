import { FileModifiers } from '../ui-types';

export type SourceCode = {
	path: string;
	value: string;
} & FileModifiers;
