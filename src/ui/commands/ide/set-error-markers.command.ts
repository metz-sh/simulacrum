import * as lodash from 'lodash';
import { Monaco } from '@monaco-editor/react';
import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getIDEStore } from '../get-stores.util';
import { CompilerError } from '../../../compiler/compiler-types';

export function setErrorMarkers(
	hostStore: StoreApi<HostState>,
	errors: (CompilerError & { sourceable: true })[]
) {
	const errorMap = lodash.groupBy(errors, (e) => e.fileName);
	const monacoOption = getIDEStore(hostStore).getState().monaco;
	if (monacoOption._tag === 'None') {
		throw new Error('Monaco not set on ide store. Can not set error markers!');
	}
	const monaco = monacoOption.value;
	for (const fileName in errorMap) {
		const uri = monaco.Uri.parse(fileName);
		const model = monaco.editor.getModel(uri);
		if (!model) {
			throw new Error('Model not found!');
		}

		const markers = errorMap[fileName].map((error) => ({
			message: error.message,
			severity: monaco.MarkerSeverity.Error,
			startLineNumber: error.position.startLine,
			startColumn: error.position.startCharacter,
			endLineNumber: error.position.endLine,
			endColumn: error.position.endCharacter,
		}));

		monaco.editor.setModelMarkers(model, 'owner', markers);
	}
}
