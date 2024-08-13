import { memo } from 'react';
import EditorComponent from './ui/components/editor/editor.component';
import PlaygroundComponent from './ui/components/playground/playground.component';

export const Editor = memo(EditorComponent);
export const Playground = memo(PlaygroundComponent);
