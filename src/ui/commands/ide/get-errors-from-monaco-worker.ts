import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { type Monaco } from '@monaco-editor/react';
import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getIDEStore } from '../get-stores.util';
import { type editor } from 'monaco-editor';
import { CompilerError } from '../../../compiler/compiler-types';

export async function getErrorsFromMonacoInstance(monaco: Monaco) {
	const models = monaco.editor.getModels();

	const errors: (CompilerError & { sourceable: true })[] = (
		await Promise.all(
			models.map(async (model: editor.ITextModel) => {
				const getWorker = await monaco.languages.typescript.getTypeScriptWorker();
				const worker = await getWorker(model.uri);
				const diagnostics = (
					await Promise.all([
						worker.getSyntacticDiagnostics(model.uri.toString()),
						worker.getSemanticDiagnostics(model.uri.toString()),
					])
				).reduce((a, it) => a.concat(it));

				return diagnostics.map((d: any) => {
					const start = model.getPositionAt(d.start);
					const fileName = decodeURI(d.file.fileName.split('file:///')[1]);

					return {
						sourceable: true,
						fileName: fileName,
						message:
							typeof d.messageText === 'string'
								? d.messageText
								: d.messageText.messageText,
						position: {
							startLine: start.lineNumber,
							startCharacter: start.column,
							endLine: start.lineNumber,
							endCharacter: start.column,
						},
					} as CompilerError & { sourceable: true };
				});
			})
		)
	).reduce((a, it) => a.concat(it));

	return errors.filter((error) => !error.fileName.endsWith('.d.ts'));
}

export function getErrorsFromMonacoWorker(hostStore: StoreApi<HostState>) {
	const ideState = getIDEStore(hostStore).getState();
	return pipe(
		ideState.monaco,
		O.match(() => {
			console.error('monaco not initialized yet!');
			return Promise.resolve([]);
		}, getErrorsFromMonacoInstance)
	);
}
