import { type MantineThemeOverride } from '@mantine/styles';
import { type Observable } from 'rxjs';
import { CodeDaemonState } from './state-managers/code-daemon/code-daemon-types';
import {
	AnalyticsEvent,
	type StateChangeEvent,
	type StateChangeSource,
} from './state-managers/host/host.state';
import { DisplayState } from './state-managers/display/display.state';

export type ElementType<T extends ReadonlyArray<unknown>> =
	T extends ReadonlyArray<infer ElementType> ? ElementType : never;
export type nodeTypesWithFixedSizes = 'methodNode' | 'previewMethodNode';

export type FSItem = {
	type: 'folder' | 'file';
	path: string;
} & (
	| { type: 'folder' }
	| {
			type: 'file';
			value: string;
	  }
);
export type FileItem = FSItem & { type: 'file' };
export type FolderItem = FSItem & { type: 'folder' };

export type FileModifiers = Partial<{
	deleteDisabled: boolean;
}>;

export type FileModifierMap = { [key: string]: FileModifiers | undefined };

export type EntryPoint = {
	nodeId: string;
	parameters: any[];
};

export type ClassMemberSetup = {
	[key: string]: Record<string, any>;
};

export type StorySetup = {
	classMemberSetup: ClassMemberSetup;
	entrypoints: EntryPoint[];
};

export type RawStorySetup = {
	id: string;
	title: string;
	script: {
		compiled: string;
		raw: string;
	};
	resolutionNodeMap?: DisplayState['resolutionNodeMap'];
};

export enum StoryResolution {
	LOW = 'LOW',
	MEDIUM = 'MEDIUM',
	HIGH = 'HIGH',
}

export type BaseProps = {
	height: string;
	projectName: string;

	display?: Partial<Pick<DisplayState, 'resolutionNodeMap'>>;
	theme?: MantineThemeOverride;
	enableModalProvider?: boolean;
	notesContent?: string;
};

export type EditorProps = {
	project: FSItem[];
	storySetups: RawStorySetup[];
	build?: CodeDaemonState['build'];
	onMount?: (params: {
		stateChangeObservable: Observable<StateChangeEvent<StateChangeSource>>;
		analyticsObservable: Observable<AnalyticsEvent>;
	}) => void;
} & BaseProps;

export type PlaygroundProps = {
	storySetups: [RawStorySetup, ...RawStorySetup[]];
	build: CodeDaemonState['build'] & { state: 'built' };
	viewFlags?: PlaygroundViewFlags;
	onMount?: (params: { analyticsObservable: Observable<AnalyticsEvent> }) => void;
} & BaseProps;

export type PlaygroundViewFlags = {
	minimal?: boolean;
	resolution?: 'low' | 'medium' | 'high';
};
