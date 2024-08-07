import { Handle, Position } from 'reactflow';
import './preview-class-node.css';
import { Text, Box } from '@mantine/core';
import { ClassNodeProps } from '../../../reactflow/models';

export default function (props: ClassNodeProps) {
	return (
		<Box>
			<Text
				ml={20}
				mt={10}
				style={{
					overflowWrap: 'break-word',
				}}
				ff={'Fira Mono, Monospace'}
				fz={40}
				color="#666"
			>
				{props.data.title}
			</Text>

			<>
				<Handle type="source" id="left" key="left" position={Position.Left} />
				<Handle type="source" id="right" key="right" position={Position.Right} />
				<Handle type="source" id="left" key="top" position={Position.Top} />
				<Handle type="source" id="bottom" key="bottom" position={Position.Bottom} />
			</>
		</Box>
	);
}
