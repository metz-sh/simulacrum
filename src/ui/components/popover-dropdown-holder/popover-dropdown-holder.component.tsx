import { Text, Flex, Group } from '@mantine/core';
import IconButtonComponent from '../icon-button/icon-button.component';
import { CgClose } from 'react-icons/cg';

export default function (props: { title: string; close?: () => void; children: React.ReactNode }) {
	return (
		<Flex direction={'column'} gap={'10px'}>
			<Group position="apart" w={'100%'}>
				<Text fz={16} ml={'5px'} color="#777">
					{props.title}
				</Text>
				{props.close && (
					<IconButtonComponent
						icon={<CgClose />}
						size={'xs'}
						minimal={true}
						onClick={props.close}
					/>
				)}
			</Group>
			{props.children}
		</Flex>
	);
}
