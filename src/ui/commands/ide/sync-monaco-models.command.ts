import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getIDEStore, getProjectStore } from '../get-stores.util';
import { getFilesFromFSTree } from '../../common/file-system/utils';

const disposalExceptions = ['file:///compiled-globals.d.ts'];

export function syncMonacoModels(hostStore: StoreApi<HostState>) {
	const projectState = getProjectStore(hostStore).getState();
	const ideState = getIDEStore(hostStore).getState();

	const { monaco } = ideState;
	const { fileSystemTree } = projectState;

	pipe(
		monaco,
		O.map((monaco) => {
			const files = getFilesFromFSTree(fileSystemTree);
			const sourceURIs = files.map((file) => {
				const uri = monaco.Uri.parse(file.path);
				const existingModel = monaco.editor.getModel(uri);
				if (existingModel) {
					return uri;
				}
				monaco.editor.createModel(file.value, 'typescript', uri);

				return uri;
			});
			return {
				sourceURIs,
				monaco,
			};
		}),
		O.map(({ sourceURIs, monaco }) => {
			const models = monaco.editor.getModels();
			models.forEach((model) => {
				const doesFileExistInSource = sourceURIs.find(
					(uri) => uri.toString() === model.uri.toString()
				);
				if (!doesFileExistInSource && !disposalExceptions.includes(model.uri.toString())) {
					model.dispose();
				}
			});
		})
	);
}
