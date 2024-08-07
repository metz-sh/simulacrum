import { Flex, Text } from '@mantine/core';
import DocModalComponent from '../doc-modal/doc-modal.component';

const sampleCode = `
/**
 * Say we created a class called 'Main', now in this script
 * we have access to 'main', it's instance.
*/

/**
 * You can invoke any public method of the instance,
 * and it will be used to set the starting point of the story.
*/
main.run();

/**
 * You can also set public properties as well.
*/
main.publicVariable = 42;

/**
 * Setting private properties is also possible,
 * but requires us to 'index' them in the following way:
*/
main['privateVariable'] = 1337;
`;

/**
 *
 */
export default function () {
	return (
		<Flex w={'100%'} direction={'column'} pt={'10px'} pb={'30px'}>
			<Text>
				Set all the necessary things for your story here. For more,&nbsp;
				<DocModalComponent
					title="How do stories work?"
					link="https://docs.metz.sh/fundamentals/stories#how-does-it-work"
					text="check out docs"
				/>
			</Text>
		</Flex>
	);
}
