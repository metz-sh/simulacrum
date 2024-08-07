import { Accordion, Badge, Box, Code, Text, createStyles } from '@mantine/core';
import CommonRenderer from '../common-renderer';
import './timeline-item-render.css';
import ordinal from 'ordinal';
import LogRenderer from '../log-renderer';
import ParamsRenderer from '../params-renderer';
import { NodeSignalState, NodeStateTimelineItem } from '../../reactflow/models';

function TimelineItemTickRenderer(props: { tick: number }) {
	return <Code color="yellow">{props.tick}</Code>;
}

export function RecivedSignalTimelineItem(props: {
	item: NodeStateTimelineItem & { event: NodeSignalState.PARSING_SIGNAL };
	key: string;
}) {
	return (
		<Accordion.Item value={props.key} key={props.key}>
			<Accordion.Control icon={<TimelineItemTickRenderer tick={props.item.tick} />}>
				<div>
					<Text color="#1789a5" className="text">
						Input recived
					</Text>
				</div>
			</Accordion.Control>
			<Accordion.Panel>
				<Box
					bg={'rgb(6,6,12)'}
					p={20}
					style={{
						borderRadius: '10px',
						justifyContent: 'center',
						alignItems: 'center',
					}}
					w={'100%'}
				>
					<ParamsRenderer params={props.item.params} parameters={props.item.parameters} />
				</Box>
			</Accordion.Panel>
		</Accordion.Item>
	);
}

export function CallingDependencyTimelineItem(props: {
	item: NodeStateTimelineItem & { event: NodeSignalState.CALLING_DEPENDENCY };
	key: string;
}) {
	return (
		<Accordion.Item value={props.key} key={props.key}>
			<Accordion.Control icon={<TimelineItemTickRenderer tick={props.item.tick} />}>
				<Text color="#1789a5" className="text">
					Calling depdendency
				</Text>
				<div className="calling_dependency_subsection" style={{ marginTop: '4px' }}>
					<Code>{props.item.destination.name}</Code>
				</div>
			</Accordion.Control>
		</Accordion.Item>
	);
}

export function DependencyResolvedTimelineItem(props: {
	item: NodeStateTimelineItem & { event: NodeSignalState.DEPENDENCY_RESOLVED };
	key: string;
}) {
	const name = props.item.destination.name;
	return (
		<Accordion.Item value={props.key} key={props.key}>
			<Accordion.Control icon={<TimelineItemTickRenderer tick={props.item.tick} />}>
				<Text color="#1789a5" className="text">
					Dependency Resolved
				</Text>
				<div className="calling_dependency_subsection" style={{ marginTop: '4px' }}>
					<Code>{name}</Code>
				</div>
			</Accordion.Control>
		</Accordion.Item>
	);
}

export function SendingSignalTimelineItem(props: {
	item: NodeStateTimelineItem & { event: NodeSignalState.SENDING_SIGNAL };
	key: string;
}) {
	return (
		<Accordion.Item value={props.key} key={props.key}>
			<Accordion.Control icon={<TimelineItemTickRenderer tick={props.item.tick} />}>
				<Text color="#1789a5" className="text">
					Sending data
				</Text>
				<div className="calling_dependency_subsection" style={{ marginTop: '4px' }}>
					<Code>{props.item.destination.name}</Code>
				</div>
			</Accordion.Control>
		</Accordion.Item>
	);
}

export function SignalParsedTimelineItem(props: {
	item: NodeStateTimelineItem & { event: NodeSignalState.SIGNAL_PARSED };
	key: string;
}) {
	return (
		<Accordion.Item value={props.key} key={props.key}>
			<Accordion.Control icon={<TimelineItemTickRenderer tick={props.item.tick} />}>
				<div>
					<Text color="#1789a5" className="text">
						Complete
					</Text>
				</div>
			</Accordion.Control>
			<Accordion.Panel>
				<Box
					bg={'rgb(6,6,12)'}
					p={20}
					style={{
						borderRadius: '10px',
						justifyContent: 'center',
						alignItems: 'center',
					}}
					w={'100%'}
				>
					<CommonRenderer params={props.item.returnValue} />
				</Box>
			</Accordion.Panel>
		</Accordion.Item>
	);
}

export function LogTimelineItem(props: {
	item: NodeStateTimelineItem & { event: NodeSignalState.LOG };
	key: string;
}) {
	return (
		<Accordion.Item value={props.key} key={props.key}>
			<Accordion.Control icon={<TimelineItemTickRenderer tick={props.item.tick} />}>
				<div>
					<Text color="#1789a5" className="text">
						Author's note
					</Text>
				</div>
			</Accordion.Control>
			<Accordion.Panel>
				<Box
					bg={'rgb(6,6,12)'}
					p={20}
					style={{
						borderRadius: '10px',
						justifyContent: 'center',
						alignItems: 'center',
					}}
					maw={'260px'}
				>
					<LogRenderer logs={props.item.logs} disableContinueButton={true} />
				</Box>
			</Accordion.Panel>
		</Accordion.Item>
	);
}

export function HaltedTimelineItem(props: {
	item: NodeStateTimelineItem & { event: NodeSignalState.HALT };
	key: string;
}) {
	return (
		<Accordion.Item value={props.key} key={props.key}>
			<Accordion.Control icon={<TimelineItemTickRenderer tick={props.item.tick} />}>
				<div>
					<Text color="#1789a5" className="text">
						Halted
					</Text>
				</div>
			</Accordion.Control>
		</Accordion.Item>
	);
}
