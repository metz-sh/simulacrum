import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getIDEStore } from '../get-stores.util';

export function addDefinitionsToMonaco(
	hostStore: StoreApi<HostState>,
	definitions: { content: string; filePath: string }[]
) {
	const ideState = getIDEStore(hostStore).getState();

	const { monaco } = ideState;
	pipe(
		monaco,
		O.map((monaco) => {
			definitions.forEach(({ content, filePath }) => {
				monaco.languages.typescript.typescriptDefaults.addExtraLib(content, filePath);
			});
		})
	);
}
