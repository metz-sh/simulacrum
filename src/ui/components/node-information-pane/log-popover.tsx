import { Box, Flex, Popover, createStyles, Text, Divider } from '@mantine/core';
import { useStory } from '../../state-managers/story/story.store';
import { useEffect, useState } from 'react';
import { Flow } from '../../../runtime/runtime-types';
import { useDisclosure } from '@mantine/hooks';
import * as lodash from 'lodash';
import LogContainer from './log-container';
import { MethodNodeData, NodeSignalState } from '../reactflow/models';

const useStyles = createStyles((theme) => ({
	dropdown: {
		backgroundColor: 'var(--bg-color)',
	},
	logPopup: {
		backgroundColor: 'rgb(6,6,12)',
	},
}));

export default function (props: { data: MethodNodeData; children: React.ReactNode }) {
	const { setFlowPlayerMode } = useStory((state) => ({
		setFlowPlayerMode: state.setFlowPlayerMode,
	}));

	const { classes } = useStyles();

	const [logs, setLogs] = useState<{ flow: Flow; logs: string[] }[]>();
	const [isOpened, { open, close, toggle }] = useDisclosure();

	useEffect(() => {
		const logs = props.data.activeExecutionLogs.reduce(
			(acc, cur) => {
				const item = cur.timeline[cur.timeline.length - 1];
				if (item.event === NodeSignalState.LOG) {
					acc.push({
						flow: cur.flow,
						logs: item.logs,
					});
				}
				return acc;
			},
			[] as { flow: Flow; logs: string[] }[]
		);
		if (logs.length) {
			setLogs(logs);
			setFlowPlayerMode('manual');
		} else {
			setLogs(undefined);
		}
	}, [
		lodash.sum(props.data.activeExecutionLogs.map((l) => l.timeline.length)),
		props.data.completedExecutionLogs.length,
	]);

	useEffect(() => {
		if (logs) {
			open();
		} else {
			close();
		}
	}, [logs]);
	return (
		<Popover
			transitionProps={{ transition: 'pop' }}
			position="top"
			classNames={classes}
			trapFocus
			opened={isOpened}
			onOpen={open}
			onClose={close}
			closeOnClickOutside={false}
			closeOnEscape={false}
		>
			<Popover.Target>{props.children}</Popover.Target>

			<Popover.Dropdown>
				<Box>
					<Text color="#aaa" fz={18} ff={'Fira Mono'}>
						Logs
					</Text>
					<Flex gap={20} mt={20}>
						{logs && logs.map((l, index) => <LogContainer key={index} {...l} />)}
					</Flex>
					{/* <Divider variant='dashed' orientation='horizontal' mt={20} mb={10} /> */}
					<Text color="#666" fz={10} mt={20}>
						Press 'play' to resume
					</Text>
				</Box>
			</Popover.Dropdown>
		</Popover>
	);
}
