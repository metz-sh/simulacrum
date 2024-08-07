import PrettyPaperComponent from '../pretty-paper/pretty-paper.component';
import { Text, Flex, Alert, Table, Box, ScrollArea, Divider } from '@mantine/core';
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
					With Collection view you can only show one property. Looks like you are showing:{' '}
					{propertiesToTrack.map((p) => p.name).join(', ')}.
				</Text>
			</Alert>
		);
	}

	const data: Record<any, any>[] = propertyValues[propertiesToTrack[0].name];
	if (data === undefined) {
		return <></>;
	}

	if (!Array.isArray(data)) {
		return (
			<Alert
				icon={<BiError size={'20px'} />}
				title="Error rendering data"
				color="red"
				styles={{ title: { fontSize: '25px' } }}
				radius={'lg'}
			>
				<Text ff={'Fira Mono'} color="#aaa">
					With Collection view the property being shown({propertiesToTrack[0].name}) must
					be an Array.
				</Text>
			</Alert>
		);
	}

	const objects = data.map((d, index) => (
		<PrettyPaperComponent
			key={index}
			sx={{ backgroundColor: 'rgb(11,11,24)', marginTop: '10px' }}
		>
			<Prism
				noCopy
				language={'tsx'}
				styles={{
					code: {
						fontSize: '22px',
					},
				}}
			>
				{JSON.stringify(d, null, 2)}
			</Prism>
		</PrettyPaperComponent>
	));

	return <>{objects}</>;
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
