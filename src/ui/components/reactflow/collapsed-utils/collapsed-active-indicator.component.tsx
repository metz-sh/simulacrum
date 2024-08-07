import { Flex, Indicator } from '@mantine/core';
import { motion } from 'framer-motion';
import { BsGearWideConnected } from 'react-icons/bs';
import {
	ClassNodeData,
	FolderNodeData,
	MethodNode,
	MethodNodeData,
	NodeData,
	isMethodNodeData,
} from '../models';
import { useStory } from '../../../state-managers/story/story.store';
import nodeManager from '../../../services/node-manager';

export default function (props: {
	nodeId: string;
	data: FolderNodeData | ClassNodeData;
	minimal?: boolean;
}) {
	const { nodes } = useStory((selector) => ({
		nodes: selector.nodes,
	}));
	const childrenMethodNodes = nodeManager
		.getAllChildren(props.nodeId, nodes)
		.filter((n) => isMethodNodeData(n.data)) as MethodNode[];
	const collectedLogs = nodeManager.collectLogs(childrenMethodNodes);
	const distribution = nodeManager.getExecutionDistribution(collectedLogs);
	const activeCount = distribution.active - distribution.halted;
	const isActive = activeCount > 0;

	const root = (
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
			<BsGearWideConnected color="#2db3c1" size={'36px'} />
		</motion.div>
	);

	const rootToRender = props.minimal ? (
		root
	) : (
		<Indicator inline size={'xl'} label={activeCount} color="orange">
			{root}
		</Indicator>
	);

	return (
		<>
			{isActive && (
				<motion.div
					key={'active'}
					initial={{ opacity: 0, scale: 0 }}
					animate={{ opacity: 1, scale: 1 }}
					// className="active_indicator"
					exit={{
						opacity: 0,
						scale: 0,
					}}
					style={
						props.minimal
							? {}
							: {
									display: 'flex',
									justifyContent: 'start',
									alignItems: 'center',
									gap: '2px',
									border: '2px solid #27365940',
									backgroundColor: 'rgba(6,3,10, 0.7)',
									borderRadius: '7px',
									padding: '3px',
								}
					}
				>
					<Flex justify={'center'} align={'center'} style={{ flexGrow: 1 }}>
						{rootToRender}
					</Flex>
				</motion.div>
			)}
		</>
	);
}
