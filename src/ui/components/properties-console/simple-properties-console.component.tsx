import PrettyPaperComponent from '../pretty-paper/pretty-paper.component';
import { Text, Flex, ScrollArea } from '@mantine/core';
import { Prism } from '@mantine/prism';
import { parseNonPrimitive } from '../node-debug-console/utils/parse-non-primitive';

export default function (props: {
	propertiesToTrack: {
		name: string;
		show?: boolean | undefined;
	}[];
	propertyValues: {
		[key: string]: any;
	};
}) {
	const { propertiesToTrack, propertyValues } = props;

	const properties = propertiesToTrack
		.map((prop) => `${prop.name}: ${parseNonPrimitive(propertyValues[prop.name])}`)
		.join(',\n');

	return (
		<ScrollArea className="nowheel" w={'100%'} h={'100%'}>
			<Prism
				noCopy
				language={'tsx'}
				styles={{
					code: {
						fontSize: '25px',
					},
				}}
			>
				{properties}
			</Prism>
		</ScrollArea>
	);
}
