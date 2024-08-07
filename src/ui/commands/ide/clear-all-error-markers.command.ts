import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getIDEStore } from '../get-stores.util';

export function clearAllErrorMarkers(hostStore: StoreApi<HostState>) {
	const monacoOption = getIDEStore(hostStore).getState().monaco;
	if (monacoOption._tag === 'None') {
		throw new Error('Monaco not set on ide store. Can not set error markers!');
	}
	const monaco = monacoOption.value;

	monaco.editor.removeAllMarkers('owner');
}
