import { Accordion, Box, Code, Divider, Flex, Paper, Text, createStyles } from '@mantine/core';
import {
	CallingDependencyTimelineItem,
	DependencyResolvedTimelineItem,
	HaltedTimelineItem,
	LogTimelineItem,
	RecivedSignalTimelineItem,
	SendingSignalTimelineItem,
	SignalParsedTimelineItem,
} from './utils/timeline-item-renderer';
import ordinal from 'ordinal';
import { ExecutionLog, NodeSignalState, NodeStateTimelineItem } from '../reactflow/models';
import { MdCancel } from 'react-icons/md';

const useStyles = createStyles((theme) => ({
	paperRoot: {
		backgroundColor: 'rgb(6,6,12)',
		display: 'flex',
		flexDirection: 'column',
		gap: '20px',
	},

	item: {
		backgroundColor: 'rgb(11,11,19)',
		'&[data-active]': {
			backgroundColor: 'rgb(11,11,19)',
		},
	},

	content: {
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
	},
}));

function renderTimeline(timeline: NodeStateTimelineItem[]) {
	return timeline.map((item, index) =>
		item.event === NodeSignalState.PARSING_SIGNAL
			? RecivedSignalTimelineItem({ item, key: index.toString() })
			: item.event === NodeSignalState.CALLING_DEPENDENCY
				? CallingDependencyTimelineItem({ item, key: index.toString() })
				: item.event === NodeSignalState.DEPENDENCY_RESOLVED
					? DependencyResolvedTimelineItem({ item, key: index.toString() })
					: item.event === NodeSignalState.SENDING_SIGNAL
						? SendingSignalTimelineItem({ item, key: index.toString() })
						: item.event === NodeSignalState.LOG
							? LogTimelineItem({ item, key: index.toString() })
							: item.event === NodeSignalState.HALT
								? HaltedTimelineItem({ item, key: index.toString() })
								: SignalParsedTimelineItem({ item, key: index.toString() })
	);
}

export default function (props: { cancelledExecutionLogs: ExecutionLog[] }) {
	const { classes } = useStyles();
	if (!props.cancelledExecutionLogs.length) {
		return <></>;
	}
	const flow = props.cancelledExecutionLogs[0].flow;
	return (
		<Paper
			shadow="md"
			withBorder
			p={'lg'}
			radius={'md'}
			className={classes.paperRoot}
			miw={270}
			w={'100%'}
		>
			<Paper
				pt={5}
				pb={5}
				radius={'md'}
				style={{
					backgroundColor: 'inherit',
				}}
			>
				<Flex justify={'space-between'} gap={90}>
					<Box>
						<Text ff={'Fira Mono'} fz={12}>
							Flow:
						</Text>
						<Text
							ff={'Fira Mono'}
							variant="gradient"
							gradient={{ from: 'gray', to: 'gray', deg: 45 }}
							fz={20}
						>
							{flow.name}
						</Text>
					</Box>
					<MdCancel color="gray" fontSize={20} />
				</Flex>
			</Paper>
			{props.cancelledExecutionLogs
				.map((log, index) => (
					<Box key={index}>
						<Divider
							variant="dashed"
							size={'xs'}
							mt={20}
							mb={20}
							orientation="horizontal"
						/>
						<Flex justify={'space-between'} gap={90} mb={20} align={'center'}>
							<Code color="gray" p={5} fz={13} ff={'Fira Mono'}>
								{ordinal(index + 1)} Call
							</Code>
						</Flex>
						<Accordion
							variant="contained"
							multiple
							classNames={classes}
							style={{ width: '100%' }}
						>
							{renderTimeline(log.timeline)}
						</Accordion>
					</Box>
				))
				.reverse()}
		</Paper>
	);
}
