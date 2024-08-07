import { Popover, ThemeIcon, Text, createStyles } from '@mantine/core';
import { motion } from 'framer-motion';
import IconSearchComponent from '../icon-search/icon-search.component';
import { Icon } from '@iconify/react';
import { ColorVariantMap } from '../../common/color-variant-map';
import { useCommands } from '../../commands/use-command.hook';
import { useStory } from '../../state-managers/story/story.store';
import { useDisclosure } from '@mantine/hooks';
import PopoverDropdownHolderComponent from '../popover-dropdown-holder/popover-dropdown-holder.component';
import { useHost } from '../../state-managers/host/host.store';
import { prettifyName } from '../../../utils/prettify';
import { NodeProps } from 'reactflow';
import { NodeData } from '../reactflow/models';

const useStyles = createStyles((theme) => ({
	actionIcon: {
		boxShadow: '2px 0 6px #659aa6, -2px 0 6px #659aa6',
		cursor: 'pointer',
	},

	root: {
		display: 'flex',
		justifyContent: 'start',
		alignItems: 'start',
		gap: '15px',
	},
}));

function NodeIcon(props: { data: NodeData }) {
	const iconData = props.data.styleCustomizations?.iconData;

	const { classes } = useStyles();

	if (!iconData) {
		return (
			<ThemeIcon
				className={classes.actionIcon}
				variant="filled"
				color={'rgb(6,6,12)'}
				size={60}
				radius={10}
				p={5}
			>
				<></>
			</ThemeIcon>
		);
	}

	return (
		<ThemeIcon
			className={classes.actionIcon}
			variant="filled"
			color={ColorVariantMap[iconData.iconColorVariant]}
			size={60}
			radius={10}
			p={5}
		>
			<Icon icon={iconData.iconString} fontSize={'60px'} pointerEvents={'none'} />
		</ThemeIcon>
	);
}

function NodeIconPopover(props: NodeProps<NodeData>) {
	const [isOpened, { open, close, toggle }] = useDisclosure();
	const isEditMode = useHost((state) => state.isEditMode);

	const {
		node: { setNodeIconData },
	} = useCommands();

	const storyId = useStory((selector) => selector.id);

	if (props.data.flags?.view?.type === 'simple') {
		return <></>;
	}

	const iconData = props.data.styleCustomizations?.iconData;

	return (
		<Popover
			position="bottom"
			shadow="md"
			opened={isOpened}
			onOpen={open}
			onClose={close}
			disabled={!isEditMode}
		>
			<Popover.Target>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						gap: '5px',
					}}
					onClick={(e) => {
						e.stopPropagation();
						toggle();
					}}
				>
					<motion.div
						style={{
							display: 'flex',
							justifyContent: 'end',
						}}
						whileHover={{
							scale: isEditMode ? 1.05 : 1,
						}}
						whileTap={{
							scale: isEditMode ? 1.02 : 1,
						}}
						transition={{
							duration: 0.05,
						}}
					>
						<NodeIcon data={props.data} />
					</motion.div>
				</div>
			</Popover.Target>
			<Popover.Dropdown
				style={{
					backgroundColor: 'rgb(6,6,12)',
				}}
				onClick={(e) => {
					e.stopPropagation();
				}}
			>
				<PopoverDropdownHolderComponent title="Icons" close={close}>
					<IconSearchComponent
						iconData={iconData}
						onSelect={(params) => {
							setNodeIconData(storyId, props, params);
						}}
					/>
				</PopoverDropdownHolderComponent>
			</Popover.Dropdown>
		</Popover>
	);
}

export default function (props: NodeProps<NodeData>) {
	const { classes } = useStyles();
	return (
		<div className={classes.root}>
			<NodeIconPopover {...props} />
			<div>
				<Text
					style={{
						overflowWrap: 'break-word',
					}}
					ff={'Fira Mono, Monospace'}
					fz={30}
					color="#75C2DE"
				>
					{prettifyName(props.data.title)}
				</Text>
			</div>
		</div>
	);
}
