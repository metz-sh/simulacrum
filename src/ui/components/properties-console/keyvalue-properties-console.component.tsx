import PrettyPaperComponent from '../pretty-paper/pretty-paper.component';
import { Text, Flex, Alert, Table, Box, ScrollArea } from '@mantine/core';
import { Prism } from '@mantine/prism';
import { parseNonPrimitive } from '../node-debug-console/utils/parse-non-primitive';
import { BiError } from 'react-icons/bi';

function InternalRenderer(props: {
	propertiesToTrack: {
		name: string;
		show?: boolean | undefined;
	}[];
	propertyValues: {
		[key: string]: any;
	};
}) {
	const { propertiesToTrack, propertyValues } = props;
	if (propertiesToTrack.length > 1) {
		return (
			<Alert
				icon={<BiError size={'20px'} />}
				title="Error rendering data"
				color="red"
				styles={{ title: { fontSize: '25px' } }}
				radius={'lg'}
			>
				<Text ff={'Fira Mono'} color="#aaa">
					With KeyValue view you can only show one property. Looks like you are showing:{' '}
					{propertiesToTrack.map((p) => p.name).join(', ')}.
				</Text>
			</Alert>
		);
	}

	const data: Map<any, any> = propertyValues[propertiesToTrack[0].name];
	if (data === undefined) {
		return <></>;
	}

	if (!(data instanceof Map)) {
		return (
			<Alert
				icon={<BiError size={'20px'} />}
				title="Error rendering data"
				color="red"
				styles={{ title: { fontSize: '25px' } }}
				radius={'lg'}
			>
				<Text ff={'Fira Mono'} color="#aaa">
					With KeyValue view the property being shown({propertiesToTrack[0].name}) must be
					a Map.
				</Text>
			</Alert>
		);
	}

	const headers = (
		<>
			<th key={'key'}>
				<Flex
					justify={'center'}
					align={'center'}
					sx={{
						backgroundColor: 'rgb(13,13,20)',
						borderRadius: '5px',
					}}
					p={5}
				>
					<Text fz={18} color="#ccc" ff={'Fira Mono'} fw={400}>
						Key
					</Text>
				</Flex>
			</th>
			<th key={'value'}>
				<Flex
					justify={'center'}
					align={'center'}
					sx={{
						backgroundColor: 'rgb(13,13,20)',
						borderRadius: '5px',
					}}
					p={5}
				>
					<Text fz={18} color="#ccc" ff={'Fira Mono'} fw={400}>
						Value
					</Text>
				</Flex>
			</th>
		</>
	);
	const rows = Array.from(data).map((d, index) => {
		const values = d;
		return (
			<tr key={index}>
				{values.map((v, index) => (
					<td key={index}>
						<Prism
							noCopy
							language={'tsx'}
							styles={{
								code: {
									fontSize: '24px',
								},
							}}
						>
							{`${parseNonPrimitive(v)}`}
						</Prism>
					</td>
				))}
			</tr>
		);
	});
	return (
		<Table withColumnBorders fontSize={'xl'} verticalSpacing={6}>
			<thead>
				<tr>{headers}</tr>
			</thead>
			<tbody>{rows}</tbody>
		</Table>
	);
}

export default function (props: {
	propertiesToTrack: {
		name: string;
		show?: boolean | undefined;
	}[];
	propertyValues: {
		[key: string]: any;
	};
	columns?: string[];
}) {
	return (
		<ScrollArea className="nowheel" w={'100%'} h={'100%'}>
			<InternalRenderer {...props} />
		</ScrollArea>
	);
}
