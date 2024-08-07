import { Modal, createStyles, Text } from '@mantine/core';
import CodeConsole from '../story-script-console/story-script-console';
import { useCallback } from 'react';
import { useCommands } from '../../commands/use-command.hook';
import { useHost } from '../../state-managers/host/host.store';
import StoryScriptHelperContentComponent from './story-script-helper-content.component';
import { RenderEngine } from '../../services/render-engine/render-engine';
import { useStory } from '../../state-managers/story/story.store';
import TextAreaComponent from '../text-area/text-area.component';
import fallbackScript from './fallback-script';

const useStyles = createStyles((theme) => ({
	content: {
		backgroundColor: 'rgba(0,0,0,0)',
	},
	consoleHost: {
		borderLeft: `2px #11161C solid`,
		borderRight: `2px #11161C solid`,
		borderBottom: `2px #11161C solid`,
		borderBottomLeftRadius: '4px',
		borderBottomRightRadius: '4px',
		backgroundColor: '#07090B',
		padding: '20px',
	},
	menuBar: {
		backgroundColor: '#11161C',
		borderTopLeftRadius: '25px',
		borderTopRightRadius: '25px',
		display: 'flex',
		justifyContent: 'start',

		position: 'relative',

		button: {
			fontWeight: 'bold',
		},
		height: '30px',
	},

	menuBarButtonSection: {
		display: 'flex',
		alignItems: 'center',
		paddingLeft: '15px',
		gap: '8px',
		zIndex: 1,
	},

	menuIcon: {
		height: '13px',
		width: '13px',
		borderRadius: '50%',
		display: 'inline-block',

		'&:hover': {
			opacity: '0.6',
		},
	},

	storyTitle: {
		borderRadius: '7px',
		backgroundColor: '#101016',
		marginTop: '30px',
		marginBottom: '30px',
	},
}));

export default function (props: { renderEngine: RenderEngine }) {
	const { classes } = useStyles();
	const {
		stores: { useStoryScriptModal },
		script,
		id: storyId,
		title: storyTitle,
	} = useStory((state) => ({
		stores: state.stores,
		script: state.script,
		id: state.id,
		title: state.title,
	}));
	const { isOpen } = useStoryScriptModal();

	const { isEditMode, emitAnalyticsEvent } = useHost((state) => ({
		isEditMode: state.isEditMode,
		emitAnalyticsEvent: state.emitAnalyticsEvent,
	}));

	const {
		stories: { setScript, reset, setStoryTitle },
		modals: { closeStoryScriptModal },
	} = useCommands();

	const build = async (compiledCode: string, tsCode: string) => {
		const script = {
			raw: tsCode,
			compiled: compiledCode,
		};
		setScript({
			storyId: storyId,
			script,
		});
		reset({ storyId: storyId, renderEngine: props.renderEngine });

		closeStoryScriptModal(storyId);
		emitAnalyticsEvent('story-script.built');
	};

	const updateStoryTitle = (title?: string) => {
		setStoryTitle({
			storyId: storyId,
			title: title!,
		});
	};

	return (
		<Modal
			opened={isOpen}
			onClose={() => {
				closeStoryScriptModal(storyId);
			}}
			centered
			withCloseButton={false}
			classNames={classes}
			size={950}
			overlayProps={{
				opacity: 0.3,
			}}
		>
			<div className={classes.menuBar}>
				<div className={classes.menuBarButtonSection}>
					<div
						className={classes.menuIcon}
						style={{
							backgroundColor: '#ED6A5E',
						}}
						onClick={() => {
							closeStoryScriptModal(storyId);
						}}
					/>
				</div>
				<div
					style={{
						position: 'absolute',
						width: '100%',
						height: '100%',
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
					}}
				>
					<Text color="#898e94">Story Script</Text>
				</div>
			</div>
			<div className={classes.consoleHost}>
				<StoryScriptHelperContentComponent />

				<div className={classes.storyTitle}>
					<TextAreaComponent
						text={storyTitle}
						validator={(newStoryTitle) => {
							if (!newStoryTitle) {
								throw new Error('Story title can not be empty!');
							}
						}}
						onUpdate={updateStoryTitle}
						mantineProps={{
							size: 'xl',
							label: 'Title',
							maxRows: 2,
							bg: '#101016',
							p: '10px',
							style: {
								borderRadius: '8px',
							},
							disabled: !isEditMode,
							styles: {
								label: {
									fontSize: '14px',
									color: '#888',
								},
								input: {
									'&[data-disabled]': {
										backgroundColor: 'inherit',
										color: 'inherit',
										opacity: 'inherit',
										cursor: 'inherit',
									},
								},
							},
						}}
					/>
				</div>

				<CodeConsole
					sourceCode={{
						path: `story-script.ts`,
						value: script?.raw || fallbackScript,
					}}
					onBuild={build}
					height="40vh"
				/>
			</div>
		</Modal>
	);
}
