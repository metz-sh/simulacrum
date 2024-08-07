import * as ts from 'typescript';
import { createSystem, createVirtualCompilerHost, createDefaultMapFromCDN } from '@typescript/vfs';
import compilerOptions from './compiler-options';

export class TSPrimordials {
	private isInitialized = false;
	private fsMap?: Map<string, string>;
	private libsFsMap?: Map<string, string>;
	private system?: ts.System;
	private host?: {
		compilerHost: ts.CompilerHost;
		updateFile: (sourceFile: ts.SourceFile) => boolean;
	};

	private initialize() {
		if (!this.libsFsMap) {
			throw new Error('libs FS is not initialized!');
		}
		this.fsMap = new Map<string, string>();
		for (const entry of this.libsFsMap.entries()) {
			this.fsMap.set(entry[0], entry[1]);
		}
		delete this.libsFsMap;
		this.system = createSystem(this.fsMap);
		this.host = createVirtualCompilerHost(this.system, compilerOptions, ts);

		this.isInitialized = true;
	}

	initializeLibsFs(libsFsMap: Map<string, string>) {
		this.libsFsMap = libsFsMap;
	}

	get() {
		if (!this.isInitialized) {
			this.initialize();
		}

		return {
			fsMap: this.fsMap!,
			system: this.system!,
			host: this.host!,
		};
	}
}
