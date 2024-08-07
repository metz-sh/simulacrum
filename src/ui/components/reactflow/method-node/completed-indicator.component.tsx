import { Flex, Indicator } from '@mantine/core';
import { motion } from 'framer-motion';
import { BsGearWideConnected } from 'react-icons/bs';
import { MethodNodeData, NodeData } from '../models';
import { useStory } from '../../../state-managers/story/story.store';
import { FaCircleCheck } from 'react-icons/fa6';

export default function (props: { nodeId: string; data: MethodNodeData; minimal?: boolean }) {
	const getExecutionDistribution = useStory((selector) => selector.getExecutionDistribution);
	const distribution = getExecutionDistribution(props.data);
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
			<FaCircleCheck color="#62C554" size={'24px'} />
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
