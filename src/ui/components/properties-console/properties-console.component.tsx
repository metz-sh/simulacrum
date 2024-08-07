import { NodeProps } from 'reactflow';
import SimplePropertiesConsoleComponent from './simple-properties-console.component';
import { Box, Text, Flex, ScrollArea } from '@mantine/core';
import TablePropertiesConsoleComponent from './table-properties-console.component';
import PrettyPaperComponent from '../pretty-paper/pretty-paper.component';
import KeyvaluePropertiesConsoleComponent from './keyvalue-properties-console.component';
import CollectionPropertiesConsoleComponent from './collection-properties-console.component';
import { ClassNodeProps } from '../reactflow/models';

export default function (props: ClassNodeProps) {
	const propertiesToTrack = props.data.properties?.filter((p) => p.show);
	if (!propertiesToTrack || !propertiesToTrack.length) {
		return <></>;
	}

	const propertyValues = props.data.propertyValues;
	if (!propertyValues) {
		return <></>;
	}

	const view = props.data.flags?.view;
	const renderer = (() => {
		if (view?.type === 'table') {
			return (
				<TablePropertiesConsoleComponent
					propertiesToTrack={propertiesToTrack}
					propertyValues={propertyValues}
					columns={view.columns}
				/>
			);
		}
		if (view?.type === 'keyvalue') {
			return (
				<KeyvaluePropertiesConsoleComponent
					propertiesToTrack={propertiesToTrack}
					propertyValues={propertyValues}
				/>
			);
		}
		if (view?.type === 'collection') {
			return (
				<CollectionPropertiesConsoleComponent
					propertiesToTrack={propertiesToTrack}
					propertyValues={propertyValues}
				/>
			);
		}
		return (
			<SimplePropertiesConsoleComponent
				propertiesToTrack={propertiesToTrack}
				propertyValues={propertyValues}
			/>
		);
	})();

	return (
		<Flex justify={'center'} p={10}>
			<PrettyPaperComponent miw={400} sx={{ borderRadius: 15 }}>
				<Text color="#666">Data console</Text>
				<ScrollArea h={295}>{renderer}</ScrollArea>
			</PrettyPaperComponent>
		</Flex>
	);
}
