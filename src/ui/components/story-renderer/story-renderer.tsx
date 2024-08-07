import { LoadingOverlay, Tabs, createStyles } from '@mantine/core';
import UnBuiltFlow from './unbuilt-flow';
import { CodeDaemonState } from '../../state-managers/code-daemon/code-daemon-types';
import { useEffect, useState } from 'react';
import StoriesMenu from '../stories-menu/stories-menu';
import FlowProviderFactory from '../story-provider-factory/story-provider-factory';
import { useStories } from '../../state-managers/stories/stories.store';
import { useCommands } from '../../commands/use-command.hook';
import { useHost } from '../../state-managers/host/host.store';
import { StoryContext } from '../../state-managers/story/story.store';
import { StoriesState } from '../../state-managers/stories/stories.state';

const useStyles = createStyles((theme) => ({
	storyMenu: {
		position: 'absolute',
		left: '20px',
		top: '50px',
		zIndex: 100,
	},
}));

function _StoryRenderer(props: {
	projectName: string;
	build: CodeDaemonState['build'];
	stories: StoriesState['stories'];
	height?: string;
}) {
	const { build, stories } = props;

	const baseProps = useHost((state) => state.baseProps);

	const [activeStoryId, setActiveStoryId] = useState<string | undefined>();
	const { classes } = useStyles();

	const isActiveStoryValid = activeStoryId && !!stories[activeStoryId];

	useEffect(() => {
		if (!isActiveStoryValid) {
			const firstStory = Object.values(stories)[0];
			setActiveStoryId(firstStory.getState().id);
		}
	}, [isActiveStoryValid]);

	if (build.state !== 'built') {
		return <UnBuiltFlow height={props.height || baseProps.height} />;
	}

	if (!isActiveStoryValid) {
		return (
			<LoadingOverlay
				loaderProps={{ size: 'md', color: 'white', variant: 'oval' }}
				visible
				overlayBlur={2}
				overlayColor="rgb(6,6,12)"
			/>
		);
	}

	const activeStory = stories[activeStoryId].getState();

	return (
		<Tabs keepMounted value={activeStoryId}>
			<div className={classes.storyMenu}>
				<StoriesMenu activeStory={activeStory} onSelect={setActiveStoryId} />
			</div>
			<div>
				{Object.keys(stories).map((storyId, index) => (
					<Tabs.Panel value={storyId} key={index}>
						<StoryContext.Provider value={stories[storyId]}>
							<FlowProviderFactory
								namespace={storyId}
								projectName={props.projectName}
								height={props.height || baseProps.height}
								build={build}
								story={stories[storyId]}
							/>
						</StoryContext.Provider>
					</Tabs.Panel>
				))}
			</div>
		</Tabs>
	);
}

export default function StoryRenderer(props: {
	projectName: string;
	build: CodeDaemonState['build'];
	height?: string;
}) {
	const { stories } = useStories((state) => ({ stories: state.stories }));
	const isEditMode = useHost((state) => state.isEditMode);

	const {
		stories: { addStoryAndSubscribe },
	} = useCommands();

	useEffect(() => {
		if (!Object.keys(stories).length) {
			if (!isEditMode) {
				throw new Error('No stories found! Please contact the author', {
					cause: 'NO_STORIES_IN_VIEW_ONLY_MODE',
				});
			}
			addStoryAndSubscribe({
				id: '0',
				title: 'Default Story',
				script: {
					raw: '',
					compiled: '',
				},
			});
		}
	}, [Object.keys(stories).length]);

	if (!Object.keys(stories).length) {
		return (
			<LoadingOverlay
				loaderProps={{ size: 'md', color: 'white', variant: 'oval' }}
				visible
				overlayBlur={2}
				overlayColor="rgb(6,6,12)"
			/>
		);
	}

	return <_StoryRenderer {...props} stories={stories} />;
}
