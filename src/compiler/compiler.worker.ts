import * as ts from 'typescript';
import {
	CompilerCommand,
	CompilerCommandEvent,
	CompilerResponse,
	CompilerResponseCode,
} from './compiler-types';
import { TSPrimordials } from './ts-primordials';
import { CompileCommandHandler } from './command-handlers/compile-command/compile-command-handler';
import { CommandHandlerIterface } from './command-handlers/command-handler.interface';
import { BuildCommandHandler } from './command-handlers/build-command/build-command-handler';
import { CompilerErrorCode } from './compliler-error-codes';
import { BuildPreviewCommandHandler } from './command-handlers/build-preview-command/build-preview-command-handler';
import { decodeToMap } from '../ui/services/map-converter';
import compilerOptions from './compiler-options';
import { getFSPayload } from './utils/get-message-payload';

type ArtifacterCommandEvent = CompilerCommandEvent & {
	command: CompilerCommand.BUILD_PREVIEW | CompilerCommand.BUILD | CompilerCommand.COMPILE;
};

const tsPrimordials = new TSPrimordials();

function initialize(libsFsMap: Map<string, string>) {
	tsPrimordials.initializeLibsFs(libsFsMap);
	const response: CompilerResponse = {
		responseCode: CompilerResponseCode.INITIALIZED,
		responseFor: CompilerCommand.INIT,
	};
	postMessage(response);
}

function getCommandHandler(
	event: ArtifacterCommandEvent,
	program: ts.Program,
	host: {
		compilerHost: ts.CompilerHost;
		updateFile: (sourceFile: ts.SourceFile) => boolean;
	},
	fsMap: Map<string, string>,
	outputMap: Map<string, string>
): CommandHandlerIterface {
	if (event.command == CompilerCommand.COMPILE) {
		return new CompileCommandHandler(program, host, fsMap, outputMap, -1);
	}
	if (event.command == CompilerCommand.BUILD_PREVIEW) {
		return new BuildPreviewCommandHandler(
			program,
			host,
			fsMap,
			outputMap,
			event.projectName,
			event.projectVersion
		);
	}
	return new BuildCommandHandler(
		program,
		host,
		fsMap,
		outputMap,
		event.projectName,
		event.projectVersion
	);
}

async function commandRouter(event: ArtifacterCommandEvent, inputFsMap: Map<string, string>) {
	const { fsMap, host } = tsPrimordials.get();

	for (const entry of inputFsMap.entries()) {
		fsMap.set(entry[0], entry[1]);
		//Added because simply adding to fsMap is not enough, the host needs to be updated as well
		//Else we don't get the updated output
		const sourceFile = ts.createSourceFile(entry[0], entry[1], ts.ScriptTarget.ES2020);
		host.updateFile(sourceFile);
	}

	const outputMap = new Map<string, string>();

	const program = ts.createProgram({
		rootNames: [...fsMap.keys()],
		options: compilerOptions,
		host: {
			...host.compilerHost,
			writeFile: (fileName: string, value: string) => {
				outputMap.set(fileName, value);
			},
		},
	});

	const commandHandler = getCommandHandler(event, program, host, fsMap, outputMap);
	const result = await commandHandler.execute();

	//Cleanup, we don't want to keep the source in compiler
	for (const entry of inputFsMap.entries()) {
		fsMap.delete(entry[0]);
	}

	const responsePayload: {
		response: CompilerResponse;
		transferrable?: any;
	} = (() => {
		if (result.responseCode === CompilerResponseCode.ERRORED) {
			return {
				response: {
					...result,
					responseFor: event.command,
				},
			};
		}

		const { payload, transferrable } = getFSPayload(outputMap);
		const response: CompilerResponse = {
			responseFor: event.command,
			responseCode: result.responseCode,
			fs: payload,
			tag: commandHandler.tag,
		};

		return {
			response,
			transferrable,
		};
	})();

	postMessage(responsePayload.response, responsePayload.transferrable);
}

addEventListener('message', async (rawEvent: MessageEvent<CompilerCommandEvent>) => {
	const event = rawEvent.data;
	const fs = decodeToMap(event.fs);
	if (event.command === CompilerCommand.INIT) {
		return initialize(fs);
	}

	try {
		await commandRouter(event as ArtifacterCommandEvent, fs);
	} catch (error: any) {
		console.error(error);
		if (Object.keys(error).includes('sourceable')) {
			return postMessage({
				responseCode: CompilerResponseCode.ERRORED,
				responseFor: event.command,
				errors: [error],
			} as CompilerResponse);
		}

		return postMessage({
			responseCode: CompilerResponseCode.ERRORED,
			responseFor: event.command,
			errors: [
				{
					sourceable: false,
					code: CompilerErrorCode.UNKNOWN,
				},
			],
		} as CompilerResponse);
	}
});
