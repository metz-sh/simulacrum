import { useEffect, useState } from 'react';
import { EditorProps, RawStorySetup } from '../../ui-types';
import { StoreApi, UseBoundStore } from 'zustand';
import { addStoryAndSubscribe } from '../../commands/stories/add-story-and-subscribe.command';
import CodeDaemon from '../code-daemon/code-daemon';
import Ide from '../ide/ide';
import subscribeToProjectState from '../../commands/state-observers/subscribe-to-project-state.command';
import subscribeToStoriesState from '../../commands/state-observers/subscribe-to-stories-state.command';
import subscribeToCodeDaemonState from '../../commands/state-observers/subscribe-to-code-daemon-state.command';
import subscribeToDisplayState from '../../commands/state-observers/subscribe-to-display-state.command';
import { initializeDisplay } from '../../commands/display/intialize-display.command';
import subscribeToNotesState from '../../commands/state-observers/subscribe-to-notes-state.command';
import { HostState } from '../../state-managers/host/host.state';
import { createHostStore, HostContext } from '../../state-managers/host/host.store';
import Root from '../root/root.component';

function addStories(params: {
	storySetups: RawStorySetup[];
	hostStore: UseBoundStore<StoreApi<HostState>>;
}) {
	for (const rawStorySetup of params.storySetups) {
		addStoryAndSubscribe(params.hostStore, {
			...rawStorySetup,
		});
	}
}

function Editor(props: EditorProps) {
	const createStore = () =>
		createHostStore(
			true,
			{
				name: props.projectName,
				fsItems: props.project,
			},
			props
		);
	const [hostStore] = useState<UseBoundStore<StoreApi<HostState>>>(createStore);

	useEffect(() => {
		if (props.display) {
			initializeDisplay(hostStore, props.display);
		}

		if (props.build) {
			hostStore.getState().stores.codeDaemonStore.getState().setBuild(props.build);
		}
		addStories({
			storySetups: props.storySetups,
			hostStore,
		});

		subscribeToProjectState(hostStore);
		subscribeToStoriesState(hostStore);
		subscribeToCodeDaemonState(hostStore);
		subscribeToDisplayState(hostStore);
		subscribeToNotesState(hostStore);

		if (props.onMount) {
			const { hostObservable, analyticsObservable } = hostStore.getState();
			props.onMount({
				stateChangeObservable: hostObservable,
				analyticsObservable,
			});
		}
	});

	return (
		<HostContext.Provider value={hostStore}>
			<CodeDaemon
				projectName={props.projectName}
				store={hostStore.getState().stores.codeDaemonStore}
			>
				<div style={{ position: 'relative' }}>
					<Ide height={props.height} />
				</div>
			</CodeDaemon>
		</HostContext.Provider>
	);
}

export default function (props: EditorProps) {
	return (
		<Root {...props}>
			<Editor {...props} />
		</Root>
	);
}
