import { Text, ScrollArea, Divider, Box, Container, SimpleGrid } from '@mantine/core';
import './node-debug-console.css';
import { VscDebugConsole } from 'react-icons/vsc';
import * as lodash from 'lodash';
import ExecutionLogComponent from './execution-log.component';
import { Flow } from '../../../runtime/runtime-types';
import nodeManager from '../../services/node-manager';
import CompletedExecutionLogComponent from './completed-execution-log.component';
import { ExecutionLog, MethodNodeProps } from '../reactflow/models';
import CancelledExecutionLogComponent from './cancelled-execution-log.component';

function EmptyTimeline() {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				border: '2px solid #333',
				width: '100%',
				height: '100%',
				borderRadius: '10px',
			}}
		>
			<Text
				color="#777"
				p={'xl'}
				align="center"
				style={{
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					gap: '5px',
				}}
			>
				<VscDebugConsole /> Events will appear here
			</Text>
		</div>
	);
}

function getInvocationIndex(params: { flow: Flow; completedExecutionLogs: ExecutionLog[] }) {
	return params.completedExecutionLogs.filter((record) => record.flow.id === params.flow.id)
		.length;
}

function NodeDebugConsole(props: { node: MethodNodeProps }) {
	const { node } = props;

	const executionDistribution = nodeManager.getExecutionDistribution(node.data);
	if (
		!executionDistribution.active &&
		!executionDistribution.completed &&
		!executionDistribution.cancelled
	) {
		return <EmptyTimeline />;
	}

	const groupedCompletedLogs = lodash.groupBy(
		node.data.completedExecutionLogs,
		(log) => log.flow.id
	);
	const groupedCancelledLogs = lodash.groupBy(
		node.data.cancelledExecutionLogs,
		(log) => log.flow.id
	);
	const activeLogs = node.data.activeExecutionLogs;
	return (
		<ScrollArea h={400} maw={1200}>
			<Container fluid>
				<ScrollArea className="nowheel" w={'100%'} h={'100%'}>
					<Box p={10}>
						<SimpleGrid
							cols={activeLogs.length >= 3 ? 3 : activeLogs.length}
							spacing={60}
						>
							{activeLogs.map((ael, index) => (
								<ExecutionLogComponent
									key={index}
									executionLog={ael}
									isComplete={false}
									invocationIndex={getInvocationIndex({
										flow: ael.flow,
										completedExecutionLogs: node.data.completedExecutionLogs,
									})}
								/>
							))}
						</SimpleGrid>
						<Divider mt={20} mb={20} orientation="horizontal" label="Completed" />
						<SimpleGrid
							cols={
								Object.keys(groupedCompletedLogs).length >= 3
									? 3
									: Object.keys(groupedCompletedLogs).length
							}
							spacing={60}
						>
							{Object.keys(groupedCompletedLogs).map((flowId, index) => (
								<CompletedExecutionLogComponent
									key={index}
									completedExecutionLogs={groupedCompletedLogs[flowId]}
								/>
							))}
						</SimpleGrid>
						<Divider mt={20} mb={20} orientation="horizontal" label="Cancelled" />
						<SimpleGrid
							cols={
								Object.keys(groupedCancelledLogs).length >= 3
									? 3
									: Object.keys(groupedCancelledLogs).length
							}
							spacing={60}
						>
							{Object.keys(groupedCancelledLogs).map((flowId, index) => (
								<CancelledExecutionLogComponent
									key={index}
									cancelledExecutionLogs={groupedCancelledLogs[flowId]}
								/>
							))}
						</SimpleGrid>
					</Box>
				</ScrollArea>
			</Container>
		</ScrollArea>
	);
}

export default NodeDebugConsole;
