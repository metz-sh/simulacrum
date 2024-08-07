import { createContext } from 'react';

export const FolderActiveContext = createContext<
	| {
			setIsActive: (isActive: boolean) => void;
	  }
	| undefined
>({
	setIsActive(isActive) {},
});
