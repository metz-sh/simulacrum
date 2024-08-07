import { Flex, Indicator } from '@mantine/core';
import { motion } from 'framer-motion';
import { BsGearWideConnected } from 'react-icons/bs';
import { MethodNodeData, NodeData } from '../models';
import { useStory } from '../../../state-managers/story/story.store';

export default function (props: { nodeId: string; data: MethodNodeData; minimal?: boolean }) {
	const getExecutionDistribution = useStory((selector) => selector.getExecutionDistribution);
	const distribution = getExecutionDistribution(props.data);
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
			<BsGearWideConnected color="#2db3c1" size={'24px'} />
		</motion.div>
	);

	const rootToRender = props.minimal ? (
		root
	) : (
		<Indicator inline size={'xs'} label={activeCount} color="orange">
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
