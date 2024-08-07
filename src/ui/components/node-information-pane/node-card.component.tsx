import { Text, createStyles, Paper, ScrollArea, Flex, Badge, Box } from '@mantine/core';
import NodeIconNameComponent from './node-icon-name.component';
import { Prism } from '@mantine/prism';
import { indentTypeScriptCode } from './utils';
import { forwardRef } from 'react';
import { NodeProps } from 'reactflow';
import LogPopover from './log-popover';
import { AnimatePresence } from 'framer-motion';
import { NodeData, isClassNodeData, isMethodNodeData } from '../reactflow/models';
import ActiveIndicatorComponent from '../reactflow/method-node/active-indicator.component';
import HaltedIndicatorComponent from '../reactflow/method-node/halted-indicator.component';
import ConditionalRenderer from '../conditional-renderer';
import CompletedIndicatorComponent from '../reactflow/method-node/completed-indicator.component';

const useStyles = createStyles((theme) => ({
	actionIcon: {
		boxShadow: '10px 0 15px #52a4fc40, -10px 0 15px #52a4fc40',
	},

	root: {
		backgroundColor: '#060516',
		display: 'flex',
		flexDirection: 'column',
		gap: '20px',
	},

	indicator: {
		display: 'flex',
		justifyContent: 'start',
		alignItems: 'center',
		gap: '2px',
		border: '2px solid #27365940',
		backgroundColor: 'rgba(6,3,10, 0.7)',
		borderRadius: '7px',
		padding: '3px',
	},
}));

function Parameters(props: { parameters?: { name: string; type: string; text: string }[] }) {
	if (!props.parameters) {
		return <></>;
	}
	const parameters = !props.parameters.length
		? ['void']
		: props.parameters.map((p) => `${p.text}`);
	const parameterString = parameters.join(',\n');
	return (
		<Paper
			shadow="md"
			radius={'md'}
			style={{
				backgroundColor: '#060626',
			}}
		>
			<Badge ml={10} mt={10} color="orange" ff={'Fira Mono'} fw={400}>
				Params
			</Badge>
			<ScrollArea className="nowheel" w={'100%'}>
				<Prism noCopy language={'typescript'} fz={'lg'}>
					{indentTypeScriptCode(parameterString)}
				</Prism>
			</ScrollArea>
		</Paper>
	);
}

function ReturnType(props: { returnType?: string }) {
	if (!props.returnType) {
		return <></>;
	}

	return (
		<Paper
			shadow="md"
			radius={'md'}
			style={{
				backgroundColor: '#060626',
			}}
		>
			<Badge ml={10} mt={10} color="green" ff={'Fira Mono'} fw={400}>
				Result
			</Badge>
			<ScrollArea className="nowheel" w={'100%'}>
				<Prism noCopy language={'typescript'} fz={'lg'}>
					{indentTypeScriptCode(props.returnType)}
				</Prism>
			</ScrollArea>
		</Paper>
	);
}

function Note(props: { note?: string }) {
	if (!props.note) {
		return <></>;
	}

	return (
		<div>
			<Text
				ff={'strawfordregular, Monospace'}
				fz={'md'}
				fs={'italic'}
				weight={500}
				color="#d9d9d9"
			>
				{props.note}
			</Text>
		</div>
	);
}

function Extras(props: { node: NodeProps<NodeData> }) {
	if (props.node.data.flags?.view?.type === 'simple') {
		return <></>;
	}

	return (
		<ScrollArea w={'100%'} mah={340}>
			<Flex direction={'column'} gap={20}>
				<ConditionalRenderer
					conditional={() => {
						const data = props.node.data;
						if (isClassNodeData(data) || isMethodNodeData(data)) {
							return <Note note={data.comment} />;
						}
					}}
				/>
				<ConditionalRenderer
					conditional={() => {
						const data = props.node.data;
						if (isMethodNodeData(data)) {
							return (
								<Flex direction={'column'} gap={'5px'}>
									<Parameters parameters={data.parameters} />
									<ReturnType returnType={data.returnType} />
								</Flex>
							);
						}
					}}
				/>
			</Flex>
		</ScrollArea>
	);
}

export default forwardRef(function (
	props: {
		node: NodeProps<NodeData>;
		onClick?: () => void;
	},
	ref: React.ForwardedRef<any>
) {
	const { classes } = useStyles();
	return (
		<Paper
			id={props.node.id}
			shadow="md"
			withBorder
			p={'lg'}
			radius={'md'}
			className={classes.root}
			sx={{
				backgroundColor: props.node.data.styleCustomizations?.passiveColor,
			}}
			miw={270}
			w={'100%'}
			ref={ref}
			onClick={props.onClick}
		>
			<Flex justify={'space-between'}>
				<Box maw={'85%'}>
					<NodeIconNameComponent {...props.node} />
				</Box>
				<Flex direction={'column'}>
					<ConditionalRenderer
						conditional={() => {
							const data = props.node.data;
							if (isMethodNodeData(data)) {
								return (
									<Flex gap={5}>
										<AnimatePresence>
											<ActiveIndicatorComponent
												key={'1'}
												nodeId={props.node.id}
												data={data}
											/>
											<HaltedIndicatorComponent
												key={'2'}
												nodeId={props.node.id}
												data={data}
											/>
											<CompletedIndicatorComponent
												key={'3'}
												nodeId={props.node.id}
												minimal={true}
												data={data}
											/>
										</AnimatePresence>
									</Flex>
								);
							}
						}}
					/>
					<ConditionalRenderer
						conditional={() => {
							const data = props.node.data;
							if (isMethodNodeData(data)) {
								return (
									<LogPopover data={data}>
										<Box h={20} />
									</LogPopover>
								);
							}
						}}
					/>
				</Flex>
			</Flex>
			<Extras node={props.node} />
		</Paper>
	);
});
