import * as ts from 'typescript';
import { Settings } from '../settings';

export default {
	target: ts.ScriptTarget.ES2020,
	outDir: 'src',
	esModuleInterop: true,
	moduleResolution: ts.ModuleResolutionKind.Node16,
	module: ts.ModuleKind.ES2020,
	rootDir: Settings.rootPath,
	declaration: true,
	experimentalDecorators: true,
	noImplicitAny: true,
	noImplicitThis: true,
	typeRoots: ['*'],
	outFile: 'bundle.js',
	strictPropertyInitialization: true,
	strictNullChecks: true,
	noLib: true,
} as ts.CompilerOptions;

export const bannedDefinitions = [
	'/lib.scripthost.d.ts',
	'/lib.webworker.importscripts.d.ts',
	'/lib.webworker.d.ts',
	'/lib.dom.iterable.d.ts',
	'/lib.dom.d.ts',
];
