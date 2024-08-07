import { Popover, ScrollArea, createStyles } from '@mantine/core';
import ErrorsRenderer from './error-renderer';
import { VscBracketError } from 'react-icons/vsc';
import { MdOutlineGppGood } from 'react-icons/md';
import { LuHourglass } from 'react-icons/lu';
import { AiOutlineInfoCircle } from 'react-icons/ai';
import { CodeDaemonState } from '../../state-managers/code-daemon/code-daemon-types';
import IconButtonComponent from '../icon-button/icon-button.component';

const useStyles = createStyles(() => ({
	buildConsoleDropDown: {
		backgroundColor: 'rgb(9,9,11)',
	},
}));

function getDisplayDataForBuildState(
	build: CodeDaemonState['build'],
	onErroredFileClick: (params: {
		activeFilePath: string;
		line: number;
		character: number;
	}) => void
): { stateName: string | JSX.Element; buttonIcon: JSX.Element; content: JSX.Element } {
	switch (build.state) {
		case 'uninitiated':
			return {
				stateName: 'Build logs',
				buttonIcon: <AiOutlineInfoCircle />,
				content: <>Press the 'Build' button to see logs here</>,
			};
		case 'processing':
			return {
				stateName: 'Building...',
				buttonIcon: <LuHourglass color="grey" />,
				content: <></>,
			};
		case 'built':
			return {
				stateName: 'Built successfully!',
				buttonIcon: <MdOutlineGppGood color="green" />,
				content: <div></div>,
			};
		case 'errored':
			return {
				stateName: 'Build failed!',
				buttonIcon: <VscBracketError color="red" />,
				content: (
					<ScrollArea style={{ height: '183px' }}>
						{<ErrorsRenderer errors={build.errors} onFileClick={onErroredFileClick} />}
					</ScrollArea>
				),
			};
	}
}

export default function (props: {
	build: CodeDaemonState['build'];
	style?: React.CSSProperties;
	onErroredFileClick: (params: {
		activeFilePath: string;
		line: number;
		character: number;
	}) => void;
}) {
	const { classes } = useStyles();
	const { buttonIcon, content } = getDisplayDataForBuildState(
		props.build,
		props.onErroredFileClick
	);

	return (
		<Popover position="left" withArrow shadow="md">
			<Popover.Target>
				<IconButtonComponent size={'md'} icon={buttonIcon} />
			</Popover.Target>
			<Popover.Dropdown className={classes.buildConsoleDropDown}>
				<div style={props.style}>{content}</div>
			</Popover.Dropdown>
		</Popover>
	);
}
