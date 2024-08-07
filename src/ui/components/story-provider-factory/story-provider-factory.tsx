import { memo, useContext, useEffect, useState } from 'react';
import StoryProvider from '../storyProvider/storyProvider';
import { CodeDaemonState } from '../../state-managers/code-daemon/code-daemon-types';
import { StoryState } from '../../state-managers/story/story.store';
import { Edge, Node } from 'reactflow';
import { EdgeData } from '../base/edge/edge-data.model';
import { Bootloader } from '../../services/bootloader/bootloader.service';
import { LoadingOverlay } from '@mantine/core';
import { HostContext } from '../../state-managers/host/host.store';
import { useCommands } from '../../commands/use-command.hook';
import { NodeData } from '../reactflow/models';
import { StoreApi } from 'zustand';

export default memo(function StoryProviderFactory(props: {
	projectName: string;
	namespace: string;
	build: CodeDaemonState['build'] & { state: 'built' };
	story: StoreApi<StoryState>;
	height?: string;
}) {
	const { build } = props;
	const hostStore = useContext(HostContext);
	if (!hostStore) {
		throw new Error('SPF not under host context!');
	}
	const bootLoader = new Bootloader(
		props.story.getState().runtime,
		props.projectName,
		props.story.getState().id,
		build
	);
	const [isLoaded, setIsLoaded] = useState(false);

	const {
		stories: { hydrateStoryScriptFromStore },
	} = useCommands();

	useEffect(() => {
		(async () => {
			const { nodes, edges } = await bootLoader.boot();
			hydrateStoryScriptFromStore(props.story.getState().id);
			props.story.setState({
				nodes,
				edges,
			});
			await props.story
				.getState()
				.setResolutionAndRefreshPrimordials(props.story.getState().resolution);

			setIsLoaded(true);
		})();
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

	return <StoryProvider namespace={props.namespace} height={props.height} />;
});
