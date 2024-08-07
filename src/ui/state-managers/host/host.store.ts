import { create, useStore } from 'zustand';
import { AnalyticsEvent, HostState, StateChangeEvent, StateChangeSource } from './host.state';
import { Subject, from } from 'rxjs';
import { createCodeDaemonStore } from '../code-daemon/code-daemon.store';
import { useStories } from '../stories/stories.store';
import { createContext, useContext } from 'react';
import { BaseProps, FSItem, FileItem } from '../../ui-types';
import { useDisplay } from '../display/display.store';

const hostSubject = new Subject<StateChangeEvent<StateChangeSource>>();
const analyticsSubject = new Subject<AnalyticsEvent>();
const analyticsObservable = from(analyticsSubject);

function getInitialFilePath(fsItems: FSItem[]) {
	const files = fsItems.filter((fsi) => fsi.type === 'file') as FileItem[];
	return files.at(0)?.path;
}

export const createHostStore = (
	isEditMode: boolean,
	project: {
		name: string;
		fsItems: FSItem[];
	},
	baseProps: BaseProps
) =>
	create<HostState>((set, get) => ({
		isEditMode,
		baseProps,

		hostSubject,
		hostObservable: from(hostSubject),
		analyticsSubject,
		analyticsObservable,

		stores: {
			codeDaemonStore: createCodeDaemonStore(
				project.name,
				project.fsItems,
				getInitialFilePath(project.fsItems),
				baseProps.notesContent
			),
			stories: useStories,
			display: useDisplay,
		},

		getHostSubject<T extends StateChangeSource>() {
			return get().hostSubject as Subject<StateChangeEvent<T>>;
		},

		emitAnalyticsEvent(event, context) {
			get().analyticsSubject.next({ event, context });
		},
	}));

export const HostContext = createContext<ReturnType<typeof createHostStore> | null>(null);

export const useHost = <T>(
	selector: (state: HostState) => T,
	equalityFn?: (a: T, b: T) => boolean
) => {
	const store = useContext(HostContext);
	if (store === null) {
		throw new Error('The component is not under HostContext!');
	}
	return useStore(store, selector, equalityFn);
};
