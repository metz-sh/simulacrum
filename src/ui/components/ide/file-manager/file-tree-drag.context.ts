import { createContext } from 'react';

export const FileTreeDragContext = createContext<
	[
		{
			draggingId?: string;
		},
	]
>([{}]);
