import { shallow } from 'zustand/shallow';
import { useStory } from '../../state-managers/story/story.store';
import { Box, Divider, Flex, Text, NavLink, ScrollArea, Indicator } from '@mantine/core';
import { CancelledFlow, Flow, ScheduledTask, SuspendedFlow } from '../../../runtime/runtime-types';
import { HiMiniBellSnooze } from 'react-icons/hi2';
import { FaStopwatch, FaClockRotateLeft } from 'react-icons/fa6';
import { TbCircleCheckFilled } from 'react-icons/tb';
import { motion } from 'framer-motion';
import { BsGearWideConnected } from 'react-icons/bs';
import TipComponent from '../tip/tip.component';
import ordinal from 'ordinal';
import { LuClock } from 'react-icons/lu';
import { MdCancel } from 'react-icons/md';

function RuntimeEntityRenderer(props: {
	color: string;
	icon?: React.ReactNode;
	label: React.ReactNode;
	rightSection: React.ReactNode;
}) {
	const { color, icon, label, rightSection } = props;

	return (
		<NavLink
			component="a"
			color={color}
			icon={icon}
			label={label}
			style={{
				borderRadius: '8px',
			}}
			active={true}
			rightSection={rightSection}
		/>
	);
}

function ActiveScheduledTaskRenderer(props: { task: ScheduledTask }) {
	const { task } = props;
	return (
		<RuntimeEntityRenderer
			color="pink"
			icon={
				<Box
					key={'halted'}
					style={{
						display: 'flex',
						justifyContent: 'start',
						alignItems: 'center',
						gap: '2px',
						border: '2px solid #27365940',
						backgroundColor: 'rgba(6,3,10, 0.7)',
						borderRadius: '7px',
						padding: '3px',
					}}
				>
					{task.type === 'timer' ? (
						<FaStopwatch color="pink" />
					) : (
						<FaClockRotateLeft color="pink" />
					)}
				</Box>
			}
			label={task.name}
			rightSection={
				<Text fz={11} ff={'Fira Mono'}>
					{task.type === 'timer'
						? `After ${task.ticks} ticks`
						: `Every ${ordinal(task.ticks)} tick`}
				</Text>
			}
		/>
	);
}

function ActiveFlowRenderer(props: { flow: Flow }) {
	const { flow } = props;
	return (
		<RuntimeEntityRenderer
			color="blue"
			icon={
				<Box
					key={'halted'}
					style={{
						display: 'flex',
						justifyContent: 'start',
						alignItems: 'center',
						gap: '2px',
						border: '2px solid #27365940',
						backgroundColor: 'rgba(6,3,10, 0.7)',
						borderRadius: '7px',
						padding: '3px',
					}}
				>
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
						<BsGearWideConnected color="#2db3c1" size={'16px'} />
					</motion.div>
				</Box>
			}
			label={flow.name}
			rightSection
		/>
	);
}

function CompletedFlowRenderer(props: { flow: Flow }) {
	const { flow } = props;
	return (
		<RuntimeEntityRenderer
			color="teal"
			icon={
				<Box
					key={'halted'}
					style={{
						display: 'flex',
						justifyContent: 'start',
						alignItems: 'center',
						gap: '2px',
						border: '2px solid #27365940',
						backgroundColor: 'rgba(6,3,10, 0.7)',
						borderRadius: '7px',
						padding: '3px',
					}}
				>
					<TbCircleCheckFilled color="#62C554" fontSize={16} />
				</Box>
			}
			label={flow.name}
			rightSection
		/>
	);
}

function CancelledFlowRenderer(props: { flow: CancelledFlow }) {
	const { flow } = props;
	return (
		<RuntimeEntityRenderer
			color="gray"
			label={flow.name}
			icon={
				<Box
					key={'halted'}
					style={{
						display: 'flex',
						justifyContent: 'start',
						alignItems: 'center',
						gap: '2px',
						border: '2px solid #27365940',
						backgroundColor: 'rgba(6,3,10, 0.7)',
						borderRadius: '7px',
						padding: '3px',
					}}
				>
					<MdCancel color="gray" fontSize={16} />
				</Box>
			}
			rightSection
		/>
	);
}

function SuspendedFlowRenderer(props: { flow: SuspendedFlow }) {
	const { flow } = props;
	return (
		<RuntimeEntityRenderer
			color="violet"
			label={flow.flowStack.flow.name}
			icon={
				<Box
					key={'halted'}
					style={{
						display: 'flex',
						justifyContent: 'start',
						alignItems: 'center',
						gap: '2px',
						border: '2px solid #27365940',
						backgroundColor: 'rgba(6,3,10, 0.7)',
						borderRadius: '7px',
						padding: '3px',
					}}
				>
					<HiMiniBellSnooze color="violet" fontSize={16} />
				</Box>
			}
			rightSection
		/>
	);
}

const rootVariants = {
	inactive: {
		color: 'rgb(0,128,128)',
	},
	active: {
		color: 'rgb(30,30,30)',
	},
};

export default function () {
	const {
		runtimeEntities: { flows, scheduledTasks, tick },
		renderTokens,
	} = useStory(
		(selector) => ({
			runtimeEntities: selector.runtimeEntities,
			renderTokens: selector.renderTokens,
		}),
		shallow
	);

	const isProcessing = !renderTokens.length;

	return (
		<Box w={'35vh'}>
			<Flex justify={'center'} align={'center'}>
				<TipComponent text="Current tick">
					<Indicator
						inline
						size={'xs'}
						label={tick}
						color="rgb(6,3,10)"
						ff={'Fira Mono'}
						position="middle-end"
						offset={0}
					>
						<motion.div
							initial={'inactive'}
							variants={rootVariants}
							animate={isProcessing ? 'active' : 'inactive'}
							transition={
								isProcessing
									? { repeat: Infinity, duration: 0.4, ease: 'linear' }
									: { duration: 0 }
							}
						>
							<LuClock color="inherit" fontSize={40} />
						</motion.div>
					</Indicator>
				</TipComponent>
			</Flex>
			<Box>
				<ScrollArea h={'34vh'} pl={20} pr={20} pb={10}>
					<Divider
						size={'xs'}
						mt={20}
						mb={20}
						orientation="horizontal"
						label={'Active'}
						color="#777"
						styles={{ label: { fontSize: '12px' } }}
					/>
					<Flex direction={'column'} gap={10}>
						{flows.active.map((flow, index) => (
							<ActiveFlowRenderer flow={flow} key={index.toString()} />
						))}
					</Flex>

					<Divider
						size={'xs'}
						mt={50}
						mb={20}
						orientation="horizontal"
						label={'Suspended'}
						color="#777"
						styles={{ label: { fontSize: '12px' } }}
					/>
					<Flex direction={'column'} gap={10}>
						{flows.suspended.map((flow, index) => (
							<SuspendedFlowRenderer flow={flow} key={index.toString()} />
						))}
					</Flex>

					<Divider
						size={'xs'}
						mt={50}
						mb={20}
						orientation="horizontal"
						label={'Scheduled'}
						color="#777"
						styles={{ label: { fontSize: '12px' } }}
					/>
					<Flex direction={'column'} gap={10}>
						{scheduledTasks.active.map((task, index) => (
							<ActiveScheduledTaskRenderer task={task} key={index.toString()} />
						))}
					</Flex>

					<Divider
						size={'xs'}
						mt={50}
						mb={20}
						orientation="horizontal"
						label={'Cancelled'}
						color="#777"
						styles={{ label: { fontSize: '12px' } }}
					/>
					<Flex direction={'column'} gap={10}>
						{flows.cancelled.map((flow, index) => (
							<CancelledFlowRenderer flow={flow} key={index.toString()} />
						))}
					</Flex>

					<Divider
						size={'xs'}
						mt={50}
						mb={20}
						orientation="horizontal"
						label={'Completed'}
						color="#777"
						styles={{ label: { fontSize: '12px' } }}
					/>
					<Flex direction={'column'} gap={10}>
						{flows.completed.map((flow, index) => (
							<CompletedFlowRenderer flow={flow} key={index.toString()} />
						))}
					</Flex>
				</ScrollArea>
			</Box>
		</Box>
	);
}
