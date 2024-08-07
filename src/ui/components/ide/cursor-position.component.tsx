import { useIDEPosition } from '../../hooks/ide/use-position.hook';
import { Group, Highlight } from '@mantine/core';
import { Position } from 'monaco-editor';

function parsePosition(param: Position | undefined) {
	if (!param) {
		return 'Line: 1, Column: 1';
	}

	return `Line: ${param.lineNumber}, Column: ${param.column}`;
}

export default function () {
	const position = useIDEPosition();
	return (
		<Group w={'100%'} position="right">
			<Highlight
				mr={20}
				ff={'Fira Mono'}
				fz={12}
				highlight={['Line', 'Column']}
				highlightStyles={{ backgroundColor: 'inherit', color: '#777' }}
			>
				{parsePosition(position)}
			</Highlight>
		</Group>
	);
}
