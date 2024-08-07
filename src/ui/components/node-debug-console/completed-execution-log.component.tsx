import {
	Accordion,
	Box,
	Code,
	Divider,
	Flex,
	Paper,
	ScrollArea,
	Text,
	createStyles,
} from '@mantine/core';
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
import { TbCircleCheckFilled } from 'react-icons/tb';
import { ExecutionLog, NodeSignalState, NodeStateTimelineItem } from '../reactflow/models';

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

export default function (props: { completedExecutionLogs: ExecutionLog[] }) {
	const { classes } = useStyles();
	if (!props.completedExecutionLogs.length) {
		return <></>;
	}
	const flow = props.completedExecutionLogs[0].flow;
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
							gradient={{ from: 'cyan', to: 'teal', deg: 45 }}
							fz={20}
						>
							{flow.name}
						</Text>
					</Box>
					<TbCircleCheckFilled color="#62C554" fontSize={20} />
				</Flex>
			</Paper>
			{props.completedExecutionLogs
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
							<Code color="teal" p={5} fz={13} ff={'Fira Mono'}>
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
