import { Flex, rem, Slider, Text } from '@mantine/core';
import { useStory } from '../../state-managers/story/story.store';
import PrettyPaperComponent from '../pretty-paper/pretty-paper.component';
import { TbZoomScanFilled } from 'react-icons/tb';
import TipComponent from '../tip/tip.component';
import { prettifyName } from '../../../utils/prettify';
import { RenderEngine } from '../../services/render-engine/render-engine';
import { useReactFlow } from 'reactflow';
import { StoryResolution } from '../../ui-types';

const ResolutionValueMap: { [key in keyof typeof StoryResolution]: number } = {
	[StoryResolution.HIGH]: 100,
	[StoryResolution.MEDIUM]: 50,
	[StoryResolution.LOW]: 0,
};

const ResolutionValueReverseMap: { [key: number]: StoryResolution } = {
	100: StoryResolution.HIGH,
	50: StoryResolution.MEDIUM,
	0: StoryResolution.LOW,
};

const MARKS = Object.keys(ResolutionValueMap).map((key) => ({
	value: ResolutionValueMap[key as StoryResolution],
	label: prettifyName(key),
}));

export default function (props: { renderEngine: RenderEngine }) {
	const resolution = useStory((state) => state.resolution);
	const reactFlow = useReactFlow();
	return (
		<PrettyPaperComponent w={150} pl={5} pr={5} pb={5} pt={5}>
			<Slider
				mt={5}
				size={'sm'}
				color="cyan"
				label={(val) => MARKS.find((mark) => mark.value === val)?.label}
				defaultValue={ResolutionValueMap[resolution]}
				step={50}
				marks={MARKS}
				styles={{
					mark: {
						borderColor: 'gray',
					},
					markFilled: {
						borderColor: 'white',
					},
					markLabel: { display: 'none' },
					track: {
						height: '4px',
					},
				}}
				onChangeEnd={(value) => {
					const resolution = ResolutionValueReverseMap[value];
					props.renderEngine.setResolution(resolution, reactFlow);
				}}
			/>
			<TipComponent text="Control the amount of information you want to see on the playground">
				<Flex mt={5} gap={5} justify={'center'} align={'center'}>
					<Text fz={8}>Resolution</Text>
				</Flex>
			</TipComponent>
		</PrettyPaperComponent>
	);
}
