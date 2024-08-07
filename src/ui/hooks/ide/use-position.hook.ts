import * as O from 'fp-ts/Option';
import { pipe } from 'fp-ts/function';

import { Position } from 'monaco-editor';
import { useEffect, useState } from 'react';
import { useCodeDaemon } from '../../state-managers/code-daemon/code-daemon.store';
import { shallow } from 'zustand/shallow';

export function useIDEPosition() {
	const useIDE = useCodeDaemon((selector) => selector.useIDE, shallow);
	const editor = useIDE((selector) => selector.editor);
	const [position, setPosition] = useState<Position | undefined>();
	useEffect(() => {
		return pipe(
			editor,
			O.match(
				() => () => {},
				(editor) => {
					const disposable = editor.onDidChangeCursorPosition((event) => {
						setPosition(event.position);
					});

					return disposable.dispose;
				}
			)
		);
	}, [editor]);

	return position;
}
