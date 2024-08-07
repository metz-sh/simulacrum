import { pipe } from 'fp-ts/function';
import { type SourceCode } from '../../models/source-code';
import { type IDEState } from '../../state-managers/ide/ide.state';
import * as O from 'fp-ts/Option';
import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore, getIDEStore } from '../get-stores.util';

export function deleteFile(hostStore: StoreApi<HostState>, path: string) {
	const projectState = getProjectStore(hostStore).getState();
	projectState.deleteProjectFile(path);
}
