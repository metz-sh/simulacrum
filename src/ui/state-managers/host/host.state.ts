import { BaseProps, FSItem } from '../../ui-types';
import { SourceCode } from '../../models/source-code';
import { Observable, Subject } from 'rxjs';
import { StoreApi } from 'zustand';
import { CodeDaemonState } from '../code-daemon/code-daemon-types';
import { StoriesState } from '../stories/stories.state';
import { StoryScriptModalState } from '../modals/story-script/story-script-modal.state';
import { StoryState } from '../story/story.store';
import { CodeDaemonStore } from '../code-daemon/code-daemon.store';
import { DisplayState } from '../display/display.state';
import { NotesState } from '../notes/notes.state';

export type StateChangeSource = 'project' | 'storySetups' | 'build' | 'display' | 'notes';

export type StateChangeEventType<T extends StateChangeSource> = T extends 'project'
	? FSItem[]
	: T extends 'storySetups'
		? Pick<StoryState, 'id' | 'title' | 'script'>[]
		: T extends 'build'
			? CodeDaemonState['build']
			: T extends 'display'
				? Pick<DisplayState, 'resolutionNodeMap'>
				: T extends 'notes'
					? { notesContent: NotesState['content'] }
					: never;

export type StateChangeEvent<T extends StateChangeSource> = {
	source: StateChangeSource;
	newState: StateChangeEventType<T>;
};

export type AnalyticsEvent = {
	event: string;
	context?: Record<string, any>;
};

export type HostState = {
	isEditMode: boolean;
	baseProps: BaseProps;

	hostSubject: Subject<StateChangeEvent<StateChangeSource>>;
	hostObservable: Observable<StateChangeEvent<StateChangeSource>>;

	analyticsSubject: Subject<AnalyticsEvent>;
	analyticsObservable: Observable<AnalyticsEvent>;

	emitAnalyticsEvent: (
		event: AnalyticsEvent['event'],
		context?: AnalyticsEvent['context']
	) => void;

	getHostSubject: <T extends StateChangeSource>() => Subject<StateChangeEvent<T>>;

	stores: {
		codeDaemonStore: CodeDaemonStore;
		stories: StoreApi<StoriesState>;
		display: StoreApi<DisplayState>;
	};
};
