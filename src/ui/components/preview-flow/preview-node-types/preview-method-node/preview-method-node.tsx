import { memo } from 'react';
import './preview-method-node.css';
import { Handle, Position } from 'reactflow';
import { Flex, Text } from '@mantine/core';
import PrettyPaperComponent from '../../../pretty-paper/pretty-paper.component';
import { MethodNodeProps } from '../../../reactflow/models';

export default memo((props: MethodNodeProps) => {
	return (
		<>
			<PrettyPaperComponent
				w={'100%'}
				h={'100%'}
				bg={'#2621a1'}
				sx={{ borderRadius: '20px' }}
			>
				<Flex h={'100%'} justify={'start'} align={'center'}>
					<Text
						style={{
							overflowWrap: 'break-word',
						}}
						ff={'Fira Mono, Monospace'}
						fz={40}
						color="#75C2DE"
					>
						{props.data.title}
					</Text>
				</Flex>
			</PrettyPaperComponent>

			<>
				<Handle type="source" id="left" key="left" position={Position.Left} />
				<Handle type="source" id="right" key="right" position={Position.Right} />
				<Handle type="source" id="left" key="top" position={Position.Top} />
				<Handle type="source" id="bottom" key="bottom" position={Position.Bottom} />
			</>
		</>
	);
});
