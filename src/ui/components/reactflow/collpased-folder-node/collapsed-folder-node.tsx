import { Handle, NodeResizer, Position } from 'reactflow';
import './collapsed-folder-node.css';
import { ThemeIcon, Text, Flex } from '@mantine/core';
import { Icon } from '@iconify/react';
import { ColorVariantMap } from '../../../common/color-variant-map';
import { prettifyName } from '../../../../utils/prettify';
import { useCommands } from '../../../commands/use-command.hook';
import { useStory } from '../../../state-managers/story/story.store';
import { FolderNodeProps, NodeData } from '../models';
import { AnimatePresence } from 'framer-motion';
import CollapsedActiveIndicatorComponent from '../collapsed-utils/collapsed-active-indicator.component';
import CollapsedCompletedIndicatorComponent from '../collapsed-utils/collapsed-completed-indicator.component';

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
				size={130}
				radius={20}
				p={20}
				style={{
					boxShadow: '2px 0 6px #659aa6, -2px 0 6px #659aa6',
					cursor: 'pointer',
				}}
			>
				<Icon
					icon={styleCustomizations.iconData.iconString}
					fontSize={'130px'}
					pointerEvents={'none'}
				/>
			</ThemeIcon>
		</div>
	);
}

export default function (props: FolderNodeProps) {
	const {
		node: { setNodeSize },
	} = useCommands();
	const { id: storyId } = useStory((state) => ({
		id: state.id,
	}));

	return (
		<div
			style={{
				width: '100%',
				height: '100%',
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

			<Flex justify={'space-between'} align={'center'} p={30} h={'100%'}>
				<Flex gap={10} align={'center'} style={{ flexGrow: 1 }} maw={'85%'}>
					<NodeIcon data={props.data} />
					<Text
						ff={'Fira Mono'}
						fz={40}
						maw={'100%'}
						color="#75C2DE"
						style={{
							overflowWrap: 'break-word',
						}}
					>
						{prettifyName(props.data.title)}
					</Text>
				</Flex>
				<Flex direction={'column'} justify={'start'} h={'100%'}>
					<Flex gap={5}>
						<AnimatePresence>
							<CollapsedActiveIndicatorComponent
								key={'1'}
								nodeId={props.id}
								data={props.data}
							/>
							<CollapsedCompletedIndicatorComponent
								key={'2'}
								nodeId={props.id}
								data={props.data}
							/>
						</AnimatePresence>
					</Flex>
				</Flex>
			</Flex>

			<>
				<Handle type="source" id="left" key="left" position={Position.Left} />
				<Handle type="source" id="right" key="right" position={Position.Right} />
				<Handle type="source" id="left" key="top" position={Position.Top} />
				<Handle type="source" id="bottom" key="bottom" position={Position.Bottom} />
			</>
		</div>
	);
}
