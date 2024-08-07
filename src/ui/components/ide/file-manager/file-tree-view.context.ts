import { createContext } from 'react';

export const FileTreeViewContext = createContext<{
	targetRef: React.MutableRefObject<HTMLDivElement>;
	scrollIntoView: (params: { alignment?: 'start' | 'end' | 'center' }) => void;
}>({} as any);
