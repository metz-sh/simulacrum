import { useCallback, useEffect, useRef } from 'react';
import { Handle, NodeProps, NodeResizer, Position } from 'reactflow';
import './class-node.css';
import { Box, createStyles, Paper, Popover, ThemeIcon, Text, Flex } from '@mantine/core';
import { Icon } from '@iconify/react';
import { useDisclosure } from '@mantine/hooks';
import { ColorVariantMap } from '../../../common/color-variant-map';
import { useHost } from '../../../state-managers/host/host.store';
import { prettifyName } from '../../../../utils/prettify';
import PopoverDropdownHolderComponent from '../../popover-dropdown-holder/popover-dropdown-holder.component';
import NodeCardComponent from '../../node-information-pane/node-card.component';
import { useCommands } from '../../../commands/use-command.hook';
import { useStory } from '../../../state-managers/story/story.store';
import PropertiesConsoleComponent from '../../properties-console/properties-console.component';
import RenderIfAllowedComponent from '../../render-if-allowed/render-if-allowed.component';
import ContainerColorPickerComponent from '../../container-color-picker/container-color-picker.component';
import { ClassNodeProps, NodeData } from '../models';

const usePopoverStyles = createStyles((theme) => ({
	dropdown: {
		backgroundColor: 'var(--bg-color)',
	},
	logPopup: {
		backgroundColor: 'rgb(11,11,11)',
	},
	actionIcon: {
		boxShadow: '2px 0 6px #659aa6, -2px 0 6px #659aa6',
	},

	root: {
		display: 'flex',
		justifyContent: 'start',
		alignItems: 'center',
		gap: '2px',
		border: '2px solid #27365940',
		backgroundColor: 'rgba(6,3,10, 0.7)',
		borderRadius: '7px',
		'&:hover': {
			boxShadow: 'var(--node-box-shadow)',
		},
		cursor: 'pointer',
	},
}));

function NodeIcon(props: { data: NodeData }) {
	const { styleCustomizations } = props.data;

	if (!styleCustomizations || !styleCustomizations.iconData) {
		return <></>;
	}

	return (
		<div className="icon">
			<ThemeIcon
				variant="filled"
				color={ColorVariantMap[styleCustomizations.iconData.iconColorVariant]}
				size={50}
				radius={10}
				p={5}
				style={{
					boxShadow: '2px 0 6px #659aa6, -2px 0 6px #659aa6',
					cursor: 'pointer',
				}}
			>
				<Icon
					icon={styleCustomizations.iconData.iconString}
					fontSize={'50px'}
					pointerEvents={'none'}
				/>
			</ThemeIcon>
		</div>
	);
}

function PopoverSection(
	props: { onStateChange?: (opened: boolean) => void } & NodeProps<NodeData>
) {
	const { classes } = usePopoverStyles();
	const emitAnalyticsEvent = useHost((state) => state.emitAnalyticsEvent);
	const [isOpened, { open, close, toggle }] = useDisclosure();

	useEffect(() => {
		if (!props.onStateChange) {
			return;
		}
		props.onStateChange(isOpened);
		if (isOpened) {
			emitAnalyticsEvent('container-node-debugger.opened');
		}
	}, [isOpened]);

	return (
		<Popover
			transitionProps={{ transition: 'pop' }}
			position="top"
			classNames={classes}
			trapFocus
			opened={isOpened}
			onOpen={open}
			onClose={close}
		>
			<Flex justify={'start'}>
				<Popover.Target>
					<Paper
						className={classes.root}
						pl={'md'}
						pr={'md'}
						pt={'xs'}
						pb={'xs'}
						onClick={toggle}
					>
						<Flex gap={10} align={'center'}>
							<NodeIcon data={props.data} />
							<Text ff={'Fira Mono'} fz={20} color="#75C2DE">
								{prettifyName(props.data.title)}
							</Text>
						</Flex>
					</Paper>
				</Popover.Target>
			</Flex>

			<Popover.Dropdown>
				<PopoverDropdownHolderComponent title="Service details" close={close}>
					<Box
						sx={{
							maxWidth: '900px',
							padding: '10px',
						}}
					>
						<NodeCardComponent node={props} />
					</Box>
				</PopoverDropdownHolderComponent>
			</Popover.Dropdown>
		</Popover>
	);
}

export default function (props: ClassNodeProps) {
	const nodeRef = useRef<HTMLDivElement>(null);

	const {
		node: { setNodeSize },
	} = useCommands();
	const { id: storyId, resolution } = useStory((state) => ({
		id: state.id,
		resolution: state.resolution,
	}));

	const onPopoverStateChange = useCallback(
		(opened: boolean) => {
			if (!nodeRef.current) {
				return;
			}

			const parent = nodeRef.current.parentElement;
			if (!parent) {
				return;
			}

			if (opened) {
				parent.style.setProperty('z-index', '1001', 'important');
			} else {
				parent.style.setProperty('z-index', '-1', 'important');
			}
		},
		[nodeRef]
	);

	return (
		<div
			ref={nodeRef}
			style={{
				width: '100%',
			}}
		>
			<NodeResizer
				nodeId={props.id}
				minWidth={100}
				minHeight={50}
				color="#75c2de"
				isVisible={props.selected}
				onResizeEnd={(_, params) => {
					setNodeSize(storyId, props, {
						width: `${params.width}px`,
						height: `${params.height}px`,
					});
				}}
				lineStyle={{
					borderStyle: 'dashed',
					padding: '2px',
				}}
			/>

			<div
				style={{
					padding: '10px',
				}}
			>
				<PopoverSection {...props} onStateChange={onPopoverStateChange} />
			</div>

			<PropertiesConsoleComponent {...props} />

			<RenderIfAllowedComponent>
				<Box
					style={{
						position: 'absolute',
						bottom: '10px',
						right: '10px',
					}}
				>
					<ContainerColorPickerComponent storyId={storyId} node={props} />
				</Box>
			</RenderIfAllowedComponent>

			<>
				<Handle type="source" id="left" key="left" position={Position.Left} />
				<Handle type="source" id="right" key="right" position={Position.Right} />
				<Handle type="source" id="left" key="top" position={Position.Top} />
				<Handle type="source" id="bottom" key="bottom" position={Position.Bottom} />
			</>
		</div>
	);
}
