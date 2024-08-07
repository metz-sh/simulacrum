import { Accordion, Box, Code, Flex, Paper, ScrollArea, Text, createStyles } from '@mantine/core';
import {
	CallingDependencyTimelineItem,
	DependencyResolvedTimelineItem,
	HaltedTimelineItem,
	LogTimelineItem,
	RecivedSignalTimelineItem,
	SendingSignalTimelineItem,
	SignalParsedTimelineItem,
} from './utils/timeline-item-renderer';
import { motion } from 'framer-motion';
import { BsGearWideConnected } from 'react-icons/bs';
import ordinal from 'ordinal';
import { TbCircleCheckFilled } from 'react-icons/tb';
import { FaHourglassHalf } from 'react-icons/fa';
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

function renderTimeline(timeline: NodeStateTimelineItem[], invocationIndex: number) {
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

export default function (props: {
	executionLog: ExecutionLog;
	isComplete: boolean;
	invocationIndex: number;
}) {
	const { classes } = useStyles();
	const currentState = props.executionLog.timeline[props.executionLog.timeline.length - 1];
	const indicator = props.isComplete ? (
		<TbCircleCheckFilled color="#62C554" fontSize={20} />
	) : currentState.event === NodeSignalState.HALT ? (
		<Flex direction={'column'} justify={'center'} align={'center'}>
			<Box>
				<FaHourglassHalf color="#2db3c1" size={'24px'} />
			</Box>
			<Text color="#2db3c1" fz={14} ff={'Fira Mono'}>
				{currentState.coveredHalts}/{currentState.haltedFor}
			</Text>
		</Flex>
	) : (
		<motion.div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				flexGrow: 1,
			}}
			animate={{ rotate: 360 }}
			transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
		>
			<BsGearWideConnected color="#2db3c1" size={'24px'} />
		</motion.div>
	);

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
				pl={12}
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
							{props.executionLog.flow.name}
						</Text>
						<Box mt={8}>
							<Code color="yellow" p={5} fz={13} ff={'Fira Mono'}>
								{ordinal(props.invocationIndex + 1)} Call
							</Code>
						</Box>
					</Box>
					{indicator}
				</Flex>
			</Paper>
			<Accordion variant="contained" multiple classNames={classes} style={{ width: '100%' }}>
				{renderTimeline(props.executionLog.timeline, props.invocationIndex)}
			</Accordion>
		</Paper>
	);
}
