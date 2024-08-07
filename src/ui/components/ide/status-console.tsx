import { LoadingOverlay, Paper, ScrollArea, Text, createStyles } from '@mantine/core';
import anime from 'animejs';
import PreviewFlowProvider from '../preview-flow/preview-flow';
import { useCodeDaemon } from '../../state-managers/code-daemon/code-daemon.store';
import { shallow } from 'zustand/shallow';
import { useEffect, useState } from 'react';
import ErrorsRenderer from '../build-console/error-renderer';
import StoryRenderer from '../story-renderer/story-renderer';
import { useCommands } from '../../commands/use-command.hook';
import { CodeDaemonState } from '../../state-managers/code-daemon/code-daemon-types';
import BuildButton from './build-button';
import TipComponent from '../tip/tip.component';
import { useHost } from '../../state-managers/host/host.store';

function ReBuildWarning(props: {
	state: 'closed' | 'enlarged' | 'open';
	build: CodeDaemonState['build'];
	projectVersion: number;
}) {
	const { state, build, projectVersion } = props;

	if (state !== 'enlarged') {
		return <></>;
	}

	if (build.state !== 'built') {
		return <></>;
	}

	if (build.artificats.projectVersion >= projectVersion) {
		return <></>;
	}

	return (
		<div
			style={{
				position: 'absolute',
				width: '100%',
				height: '100%',
				display: props.state === 'closed' ? 'none' : 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				top: '50px',
				zIndex: 1,
			}}
		>
			<Paper
				p={'8px'}
				style={{
					backgroundColor: 'rgba(88,33,44, 0.2)',
				}}
			>
				<Text
					color="#898e94"
					style={{
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'end',
						gap: '2px',
					}}
				>
					You have made some changes to the code since your last visit. Press{' '}
					<BuildButton ml={'6px'} mr={'6px'} /> to see them.
				</Text>
			</Paper>
		</div>
	);
}

const useStyles = createStyles((theme) => ({
	container: {
		position: 'absolute',
		left: '15px',
		bottom: '15px',
		zIndex: 1,
	},
	preview: {
		borderLeft: `2px #11161C solid`,
		borderRight: `2px #11161C solid`,
		borderBottom: `2px #11161C solid`,
		borderBottomLeftRadius: '4px',
		borderBottomRightRadius: '4px',
		backgroundColor: '#07090B',
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

		cursor: 'pointer',
	},
}));

const ResizeMenuIconStateColor: { [key in 'open' | 'enlarged']: string } = {
	open: '#62C554',
	enlarged: '#F5BF4F',
};

const CloseMenuIconColor = '#ED6A5E';

function getStateSizes(providedHeight?: string) {
	const enlargedHeight = providedHeight ? `calc(${providedHeight} - 60px)` : '90vh';
	const stateSizes: { [key in 'open' | 'enlarged' | 'closed']: string } = {
		open: '35vh',
		enlarged: enlargedHeight,
		closed: '0vh',
	};

	return stateSizes;
}

export default function () {
	const { classes } = useStyles();

	const { preview, build, useProject, compiledProjectVersion } = useCodeDaemon(
		(state) => ({
			preview: state.preview,
			stores: state.stores,
			build: state.build,
			useProject: state.useProject,
			compiledProjectVersion: state.compiledProjectVersion,
		}),
		shallow
	);

	const { height: providedHeight } = useHost((state) => state.baseProps);
	const stateSizes = getStateSizes(providedHeight);

	const { projectName, projectVersion } = useProject((state) => ({
		projectName: state.name,
		projectVersion: state.version,
	}));

	const {
		ide: { enableIDEOverlay, disableIDEOverlay, setEditorLocation },
	} = useCommands();

	const [state, setState] = useState<'open' | 'enlarged' | 'closed'>('open');

	useEffect(() => {
		if (state === 'enlarged') {
			enableIDEOverlay();
			return;
		}
		disableIDEOverlay();
	}, [state]);

	const menuBarButtons = (
		<div className={classes.menuBarButtonSection}>
			<TipComponent text={state === 'open' ? 'Close Preview' : 'Close Playground'}>
				<div
					className={classes.menuIcon}
					style={{
						backgroundColor: CloseMenuIconColor,
						display: state === 'closed' ? 'none' : 'inherit',
					}}
					onClick={() => {
						setState('closed');
					}}
				/>
			</TipComponent>
			<TipComponent
				text={
					state === 'open'
						? 'Open Playground'
						: state === 'enlarged'
							? 'Back to Preview'
							: 'Open Preview'
				}
			>
				<div
					className={classes.menuIcon}
					style={{
						backgroundColor:
							state === 'closed'
								? ResizeMenuIconStateColor['open']
								: ResizeMenuIconStateColor[state],
						...(state === 'closed'
							? {
									height: '35px',
									width: '80px',
									boxShadow: '3px 0 7px #ffffff30, -3px 0 7px #ffffff30',
									borderRadius: '7px',
									display: 'flex',
									justifyContent: 'center',
									alignItems: 'center',
									cursor: 'pointer',
									backgroundColor: 'rgb(6,6,12)',
									border: '1px solid #aaa',
								}
							: {}),
					}}
					onClick={() => {
						if (state === 'open') {
							setState('enlarged');
						} else {
							setState('open');
						}
					}}
				>
					{state === 'closed' && (
						<Text fw={800} fz={'sm'}>
							Preview
						</Text>
					)}
				</div>
			</TipComponent>
		</div>
	);

	const menuBarTitle = (
		<div
			style={{
				position: 'absolute',
				width: '100%',
				height: '100%',
				display: state === 'closed' ? 'none' : 'flex',
				justifyContent: 'center',
				alignItems: 'center',
			}}
		>
			<Text color="#898e94">{state === 'enlarged' ? 'Playground' : 'Preview'}</Text>
		</div>
	);

	const [isLoaded, setIsLoaded] = useState(false);
	useEffect(() => {
		if (compiledProjectVersion >= 1) {
			setTimeout(() => {
				setIsLoaded(true);
			}, 200);
		}
	}, [compiledProjectVersion]);

	if (!isLoaded) {
		return (
			<LoadingOverlay
				loaderProps={{ size: 'md', color: 'white', variant: 'oval' }}
				visible
				overlayColor="rgb(6,6,12)"
				overlayOpacity={1}
			/>
		);
	}

	const errorState =
		preview.state === 'errored'
			? { isErrored: true, errors: preview.errors }
			: build.state === 'errored'
				? { isErrored: true, errors: build.errors }
				: undefined;

	return (
		<div
			className={classes.container}
			style={{ width: state === 'enlarged' ? '98%' : 'inherit' }}
		>
			<div
				className={classes.menuBar}
				style={{ backgroundColor: state === 'closed' ? '#11161C00' : '#11161C' }}
			>
				{menuBarButtons}

				{menuBarTitle}
				<ReBuildWarning build={build} state={state} projectVersion={projectVersion} />
			</div>
			<div
				className={classes.preview}
				style={{ borderColor: state === 'closed' ? '#0011161C' : '#11161C' }}
			>
				<div
					style={{
						width: state === 'enlarged' ? '100%' : stateSizes[state],
						height: stateSizes[state],
					}}
				>
					{errorState?.isErrored ? (
						<ScrollArea h={stateSizes[state]} p={'sm'}>
							<ErrorsRenderer
								errors={errorState?.errors}
								onFileClick={(params) => {
									setEditorLocation(params);
								}}
							/>
						</ScrollArea>
					) : state === 'enlarged' ? (
						<StoryRenderer
							projectName={projectName}
							build={build}
							height={stateSizes[state]}
						/>
					) : preview.state === 'built' ? (
						<PreviewFlowProvider preview={preview} />
					) : (
						<div style={{ position: 'relative', width: '100%', height: '100%' }}>
							<LoadingOverlay
								loaderProps={{ size: 'md', color: 'white', variant: 'oval' }}
								visible
								overlayColor="#000"
							/>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
