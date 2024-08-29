import { Box, Flex, Text } from '@mantine/core';
import PrettyPaperComponent from './pretty-paper/pretty-paper.component';

export default function (props: { error: Error }) {
	return (
		<Flex w={'100%'} h={'100%'} justify={'center'} align={'center'}>
			<PrettyPaperComponent w={'60%'} mah={'50vh'} sx={{ overflow: 'scroll' }}>
				<Box>
					<Text color="red" ff={'Fira Mono'} fw={500}>
						{props.error.message}
					</Text>
					<Text color="gray" ff={'Fira Mono'} fw={500} fz={15}>
						{props.error.stack}
					</Text>
				</Box>
			</PrettyPaperComponent>
		</Flex>
	);
}
