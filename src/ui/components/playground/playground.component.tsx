import { useEffect, useState } from 'react';
import { PlaygroundProps, RawStorySetup } from '../../ui-types';
import { StoreApi, UseBoundStore } from 'zustand';
import { addStoryAndSubscribe } from '../../commands/stories/add-story-and-subscribe.command';
import { initializeDisplay } from '../../commands/display/intialize-display.command';
import StoryRenderer from '../story-renderer/story-renderer';
import { LoadingOverlay } from '@mantine/core';
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

function Playground(props: PlaygroundProps) {
	const createStore = () =>
		createHostStore(
			false,
			{
				name: props.projectName,
				fsItems: [],
			},
			props
		);
	const [hostStore] = useState<UseBoundStore<StoreApi<HostState>>>(createStore);

	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		hostStore.getState().stores.codeDaemonStore.getState().setBuild(props.build);

		if (props.onMount) {
			props.onMount({
				analyticsObservable: hostStore.getState().analyticsObservable,
			});
		}

		if (props.display) {
			initializeDisplay(hostStore, props.display);
		}

		addStories({
			storySetups: props.storySetups,
			hostStore,
		});

		setIsLoaded(true);
	}, []);

	if (!isLoaded) {
		return (
			<LoadingOverlay
				loaderProps={{ size: 'md', color: 'white', variant: 'oval' }}
				visible
				overlayBlur={2}
				overlayColor="rgb(6,6,12)"
			/>
		);
	}

	return (
		<HostContext.Provider value={hostStore}>
			<StoryRenderer {...props} />
		</HostContext.Provider>
	);
}

export default function (props: PlaygroundProps) {
	return (
		<Root {...props}>
			<Playground {...props} />
		</Root>
	);
}
