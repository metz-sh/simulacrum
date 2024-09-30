import libs from './libs.json';
import {
	CompilerCommand,
	CompilerCommandEvent,
	CompilerCommandRequest,
	CompilerErrors,
	CompilerResponse,
	CompilerResponseCode,
} from './compiler-types';
import { decodeToMap } from '../ui/services/map-converter';
import { getFSPayload } from './utils/get-message-payload';

export class CompilerService {
	private isInitialized = false;
	private worker = new Worker(new URL('./compiler.worker.ts', import.meta.url), {
		type: 'module',
	});
	libsFs = libs as [string, string][];

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
		const libsFsMap = this.parseLibs();
		this.sendCommand({
			command: CompilerCommand.INIT,
			fs: libsFsMap,
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

	private parseLibs(): Map<string, string> {
		const libsFsMap = new Map<string, string>();
		for (const lib of libs) {
			const [file, value] = lib;
			libsFsMap.set(file, value);
		}

		return libsFsMap;
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
