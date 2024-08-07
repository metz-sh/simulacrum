import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getIDEStore, getProjectStore } from '../get-stores.util';
import { SourceCode } from '../../models/source-code';

export function addFilesToMonaco(
	hostStore: StoreApi<HostState>,
	files: SourceCode[],
	noRefresh?: boolean
) {
	const ideState = getIDEStore(hostStore).getState();

	const { monaco } = ideState;

	return pipe(
		monaco,
		O.map((monaco) => {
			for (const { path, value } of files) {
				const uri = monaco.Uri.parse(path);
				const existingModel = monaco.editor.getModel(uri);
				if (existingModel) {
					existingModel.setValue(value);
					continue;
				}
				monaco.editor.createModel(value, 'typescript', monaco.Uri.parse(path));
			}
		})
	);
}
