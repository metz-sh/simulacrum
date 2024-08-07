import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';
import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getIDEStore } from '../get-stores.util';

export function setEditorLocation(
	hostStore: StoreApi<HostState>,
	params: {
		activeFilePath: string;
		line: number;
		character: number;
	}
) {
	const ideState = getIDEStore(hostStore).getState();
	ideState.setEditorLocation(params);
}
