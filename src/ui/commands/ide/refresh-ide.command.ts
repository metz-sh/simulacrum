import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getIDEStore } from '../get-stores.util';
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';
import { Uri } from 'monaco-editor';

export function refreshIDE(hostStore: StoreApi<HostState>) {
	const ideState = getIDEStore(hostStore).getState();

	const { monaco } = ideState;

	pipe(
		monaco,
		O.map((monaco) => {
			monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
				monaco.languages.typescript.typescriptDefaults.getCompilerOptions()
			);
		})
	);
}
