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
import { FaCircleCheck } from 'react-icons/fa6';
import nodeManager from '../../../services/node-manager';

export default function (props: {
	nodeId: string;
	data: ClassNodeData | FolderNodeData;
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
	const isComplete = activeCount === 0 && distribution.completed > 0;

	const rootToRender = (
		<motion.div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				flexGrow: 1,
			}}
		>
			<FaCircleCheck color="#62C554" size={'36px'} />
		</motion.div>
	);

	return (
		<>
			{isComplete && (
				<motion.div
					key={'complete'}
					initial={{ opacity: 0, scale: 0 }}
					animate={{ opacity: 1, scale: 1 }}
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
									border: '2px solid rgba(98, 197, 84, 0.2)',
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
