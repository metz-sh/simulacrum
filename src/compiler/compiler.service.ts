import {
	CompilerCommand,
	CompilerCommandEvent,
	CompilerCommandRequest,
	CompilerErrors,
	CompilerResponse,
	CompilerResponseCode,
} from './compiler-types';
import { createDefaultMapFromCDN } from '@typescript/vfs';
import * as ts from 'typescript';
import { decodeToMap } from '../ui/services/map-converter';
import compilerOptions, { bannedDefinitions } from './compiler-options';
import { getFSPayload } from './utils/get-message-payload';

export class CompilerService {
	private isInitialized = false;
	private worker = new Worker(new URL('./compiler.worker.ts', import.meta.url), {
		type: 'module',
	});
	libsFsMap: Map<string, string> = new Map();

	constructor(
		private readonly projectName: string,
		private readonly onInitialized: (compilerService: CompilerService) => void,
		private readonly onCompiled: (fsMap: Map<string, string>) => void,
		private readonly onBuilt: (fsMap: Map<string, string>, tag: string | number) => void,
		private readonly onBuiltPreview: (fsMap: Map<string, string>, tag: string | number) => void,
		private readonly onError: (params: {
			responseFor: CompilerCommand;
			errors: CompilerErrors;
		}) => void
	) {
		this.initializeLibsFs()
			.then((libsFsMap) => {
				this.sendCommand({
					command: CompilerCommand.INIT,
					fs: libsFsMap!,
				});
				this.libsFsMap = libsFsMap;
			})
			.catch((e) => {
				throw new Error(e);
			});

		this.worker.onmessage = (event: MessageEvent<CompilerResponse>) => {
			if (event.data.responseCode === CompilerResponseCode.INITIALIZED) {
				this.isInitialized = true;
				this.onInitialized(this);
				return;
			}

			if (event.data.responseCode === CompilerResponseCode.COMPILED) {
				this.onCompiled(decodeToMap(event.data.fs));
				return;
			}

			if (event.data.responseCode === CompilerResponseCode.BUILT) {
				this.onBuilt(decodeToMap(event.data.fs), event.data.tag);
				return;
			}

			if (event.data.responseCode === CompilerResponseCode.BUILT_PREVIEW) {
				this.onBuiltPreview(decodeToMap(event.data.fs), event.data.tag);
				return;
			}

			if (event.data.responseCode === CompilerResponseCode.ERRORED) {
				this.onError({
					responseFor: event.data.responseFor,
					errors: event.data.errors,
				});
				return;
			}
		};
	}

	private async initializeLibsFs() {
		const result = await createDefaultMapFromCDN(compilerOptions, '5.0.2', true, ts);
		bannedDefinitions.forEach((def) => result.delete(def));
		return result;
	}

	sendCompileCommand(fs: Map<string, string>) {
		if (!this.isInitialized) {
			throw new Error('Compiler worker is not initialized!');
		}

		this.sendCommand({
			command: CompilerCommand.COMPILE,
			fs,
		});
	}

	sendBuildCommand(fs: Map<string, string>, projectVersion: number) {
		if (!this.isInitialized) {
			throw new Error('Compiler worker is not initialized!');
		}

		this.sendCommand({
			command: CompilerCommand.BUILD,
			fs,
			projectName: this.projectName,
			projectVersion,
		});
	}

	sendBuildPreviewCommand(fs: Map<string, string>, projectVersion: number, projectName?: string) {
		if (!this.isInitialized) {
			throw new Error('Compiler worker is not initialized!');
		}

		this.sendCommand({
			command: CompilerCommand.BUILD_PREVIEW,
			fs,
			projectName: projectName || this.projectName,
			projectVersion,
		});
	}

	private sendCommand(commandRequest: CompilerCommandRequest) {
		const { fs: rawFs } = commandRequest;
		const { payload, transferrable } = getFSPayload(rawFs);
		const event: CompilerCommandEvent = (() => {
			if (commandRequest.command === CompilerCommand.BUILD) {
				return {
					command: commandRequest.command,
					fs: payload,
					projectName: commandRequest.projectName,
					projectVersion: commandRequest.projectVersion,
				};
			}
			if (commandRequest.command === CompilerCommand.BUILD_PREVIEW) {
				return {
					command: commandRequest.command,
					fs: payload,
					projectName: commandRequest.projectName,
					projectVersion: commandRequest.projectVersion,
				};
			}
			return {
				command: commandRequest.command,
				fs: payload,
			};
		})();
		this.worker.postMessage(event, transferrable);
	}
}
