import {
	createStyles,
	Box,
	NavLink,
	Popover,
	Text,
	Burger,
	Paper,
	ActionIcon,
	TextInput,
	ScrollArea,
	Highlight,
	Group,
	Flex,
	Indicator,
} from '@mantine/core';
import { VscPlay } from 'react-icons/vsc';
import { useDisclosure } from '@mantine/hooks';
import { useCallback, useState } from 'react';
import { IconTrash } from '@tabler/icons-react';
import { useStories } from '../../state-managers/stories/stories.store';
import { StoryState } from '../../state-managers/story/story.store';
import { FaPlusSquare, FaProjectDiagram } from 'react-icons/fa';
import { debounce, noop } from 'lodash';
import { BiSearch, BiDuplicate, BiPlus } from 'react-icons/bi';
import TextAreaComponent from '../text-area/text-area.component';
import { useCommands } from '../../commands/use-command.hook';
import ButtonComponent from '../button/button.component';
import { useHost } from '../../state-managers/host/host.store';
import DocModalComponent from '../doc-modal/doc-modal.component';
import RenderIfAllowedComponent from '../render-if-allowed/render-if-allowed.component';
import IconButtonComponent from '../icon-button/icon-button.component';
import { FaPlus } from 'react-icons/fa6';
import { openConfirmModal } from '../open-modal/open-confirm-modal';

function EmptySearchResults() {
	return (
		<div
			style={{
				display: 'flex',
				justifyContent: 'center',
				alignItems: 'center',
				border: '1px dashed #333',
				width: '100%',
				borderRadius: '10px',
				marginTop: '20px',
			}}
		>
			<Text color="#444" p={'xl'}>
				No story found with that name!
			</Text>
		</div>
	);
}

function StorySearchInput(props: { onSubmit: (text: string) => void }) {
	const [error, setError] = useState<string | undefined>(undefined);
	const [value, setValue] = useState<string>('');
	const debouncedUpdate = useCallback(debounce(props.onSubmit, 200), []);
	return (
		<TextInput
			styles={{
				input: {
					backgroundColor: 'rgb(6,6,12)',
				},
			}}
			value={value}
			onChange={(event) => {
				const text = event.currentTarget.value;
				if (text) {
					setError(undefined);
				}
				setValue(text);
				debouncedUpdate(text);
			}}
			error={error}
			icon={<BiSearch color="#999" />}
			placeholder={`Search stories`}
		/>
	);
}

function getDeleteModal(params: { storyName: string; onConfirm: () => void }) {
	return {
		title: 'Are you sure you want to delete?',
		children: (
			<div
				style={{
					display: 'flex',
					gap: '7px',
					justifyContent: 'start',
					alignItems: 'center',
				}}
			>
				<Text size="md" span>
					Story title:
				</Text>
				<Text
					component="span"
					variant="gradient"
					gradient={{ from: 'cyan', to: 'indigo', deg: 45 }}
					ta="center"
					fz="lg"
					fw={700}
				>
					{params.storyName}
				</Text>
			</div>
		),
		onConfirm: params.onConfirm,
	};
}

const useStyles = createStyles((theme) => ({
	dropdown: {
		minWidth: '280px',
		maxWidth: '21vw',
		backgroundColor: 'rgb(6,6,12)',
		paddingRight: 0,
	},

	button: {
		backgroundColor: 'black',
		color: 'white',
		border: '1px solid #ddd',

		'&:hover': {
			color: '#113afc',
			backgroundColor: 'white',
		},

		'&:active': {
			color: '#113afc',
			backgroundColor: 'white',
		},

		div: {
			justifyContent: 'start',
		},
	},

	box: {
		backgroundColor: 'rgb(6,6,12)',
		display: 'flex',
		flexDirection: 'column',
		gap: '10px',
		width: '100%',
		maxWidth: '260px',
	},

	menuBox: {
		minWidth: '10vw',
		maxWidth: '25vw',
		backgroundColor: 'rgb(6,6,12)',
		border: '1px solid #25262b',
		borderRadius: '7px',
		padding: '10px',
	},

	menu: {
		marginTop: '15px',
		backgroundColor: 'inherit',
	},

	activeStoryTitle: {
		borderRadius: '7px',
		paddingLeft: '10px',
	},

	categoryTitle: {
		span: {
			fontFamily: 'Fira Mono',
			fontSize: '14px',
		},
	},

	storyTitle: {
		span: {
			fontSize: '14px',
		},
		borderRadius: '8px',
	},
}));

export default function (props: { activeStory: StoryState; onSelect: (id: string) => void }) {
	const { classes } = useStyles();
	const [opened, { close, toggle }] = useDisclosure(false);
	const [searchQuery, setSearchQuery] = useState<string>('');

	const { stories, deleteStory, getStoryIdForCreation } = useStories((state) => ({
		stories: state.stories,
		addStory: state.addStory,
		deleteStory: state.deleteStory,
		getStoryIdForCreation: state.getStoryIdForCreation,
	}));

	const {
		stories: { addStoryAndSubscribe },
	} = useCommands();

	const { emitAnalyticsEvent, isEditMode } = useHost((state) => ({
		isEditMode: state.isEditMode,
		emitAnalyticsEvent: state.emitAnalyticsEvent,
	}));

	const storyCount = Object.keys(stories).length;

	const storyNameBox = (
		<div className={classes.menuBox}>
			<Group position="apart" w={'100%'}>
				<Text fz={12} color="#555964">
					{`Stories${isEditMode ? ' Manager' : ''}`}
				</Text>
				<DocModalComponent
					text="What's this?"
					size="xs"
					title="What are stories?"
					link="https://docs.metz.sh/stories"
				/>
			</Group>
			<Paper shadow="xs" className={classes.menu}>
				<Flex direction={'column'} justify={'space-evenly'} gap={'14px'} w={'100%'}>
					<Flex gap={'10px'} align={'center'} justify={'start'} w={'100%'}>
						<Indicator
							inline
							size={'xs'}
							label={storyCount}
							color="rgb(6,3,10)"
							ff={'Fira Mono'}
							position="top-end"
							offset={3}
						>
							<Burger opened={opened} onClick={toggle} size={'sm'} />
						</Indicator>
						<div className={classes.activeStoryTitle}>
							<Text size={'xl'}>{props.activeStory.title}</Text>
						</div>
					</Flex>
					<RenderIfAllowedComponent>
						<Flex
							gap={'6px'}
							justify={'center'}
							sx={{
								backgroundColor: '#0c0d12',
								borderRadius: '10px',
								padding: '2px',
							}}
						>
							<IconButtonComponent
								tip="Add new story"
								icon={<FaPlusSquare size="15px" />}
								minimal
								onClick={(e) => {
									const id = getStoryIdForCreation();
									addStoryAndSubscribe({
										id,
										title: `New Story`,
										script: {
											raw: '',
											compiled: '',
										},
									});
									emitAnalyticsEvent('story.created');
									props.onSelect(id);
									setSearchQuery('');
									close();
									e.stopPropagation();
								}}
							/>
							<IconButtonComponent
								tip="Create new from this"
								icon={<BiDuplicate size="15px" />}
								minimal
								onClick={(e) => {
									const activeStoryFromStore =
										stories[props.activeStory.id].getState();
									const currentStory = activeStoryFromStore;
									const id = getStoryIdForCreation();
									addStoryAndSubscribe({
										id,
										title: `${currentStory.title} copy`,
										script: currentStory.script,
										resolutionNodeMap: currentStory.resolutionNodeMap,
									});
									emitAnalyticsEvent('story.created');
									props.onSelect(id);
									setSearchQuery('');
									close();
									e.stopPropagation();
								}}
							/>
							<IconButtonComponent
								tip="Delete story"
								icon={<IconTrash size="15px" />}
								minimal
								onClick={(e) => {
									const activeStoryFromStore =
										stories[props.activeStory.id].getState();
									openConfirmModal(
										getDeleteModal({
											storyName: activeStoryFromStore.title,
											onConfirm() {
												deleteStory(activeStoryFromStore.id);
												emitAnalyticsEvent('story.deleted');
											},
										})
									);
									e.stopPropagation();
								}}
							/>
						</Flex>
					</RenderIfAllowedComponent>
				</Flex>
			</Paper>
		</div>
	);
	const storySearchBox = (
		<StorySearchInput
			onSubmit={(searchQuery) => {
				setSearchQuery(searchQuery);
			}}
		/>
	);

	const storyStates = Object.values(stories);
	const filteredStories = searchQuery
		? storyStates.filter((story) => story.getState().title.includes(searchQuery))
		: storyStates;

	const filteredStoryBoxes = filteredStories.map((story, index) => (
		<NavLink
			component="a"
			key={index}
			color="pink"
			icon={<VscPlay />}
			label={
				<Highlight
					highlight={searchQuery}
					highlightStyles={{ backgroundColor: '#52a4fc90' }}
					style={{
						overflowWrap: 'break-word',
					}}
				>
					{story.getState().title}
				</Highlight>
			}
			className={classes.storyTitle}
			active={story.getState().id === props.activeStory.id}
			onClick={() => {
				props.onSelect(story.getState().id);
				setSearchQuery('');
				close();
			}}
		/>
	));

	return (
		<Popover
			transitionProps={{ duration: 0 }}
			opened={opened}
			position="bottom-start"
			classNames={classes}
			onClose={() => {
				setSearchQuery('');
			}}
		>
			<Popover.Target>{storyNameBox}</Popover.Target>
			<Popover.Dropdown>
				<ScrollArea h={'30vh'} pr={'15px'} pl={'5px'}>
					<Box className={classes.box}>
						{storySearchBox}
						{filteredStoryBoxes.length ? filteredStoryBoxes : <EmptySearchResults />}
					</Box>
				</ScrollArea>
			</Popover.Dropdown>
		</Popover>
	);
}
