import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import 'reactflow/dist/base.css';
import '../reactflow/reactflow.css';

import { memo } from 'react';
import { EntryPoint, PlaygroundViewFlags } from '../../ui-types';
import Story from '../story/story.component';

const StoryWrapper = memo(
	(props: { namespace: string; height?: string; viewFlags?: PlaygroundViewFlags }) => {
		return (
			<Story namespace={props.namespace} height={props.height} viewFlags={props.viewFlags} />
		);
	}
);

function StoryProvider(props: {
	namespace: string;
	firstNodeData?: EntryPoint;
	height?: string;
	viewFlags?: PlaygroundViewFlags;
}) {
	const { namespace, height } = props;

	return (
		<ReactFlowProvider>
			<StoryWrapper namespace={namespace} height={height} viewFlags={props.viewFlags} />
		</ReactFlowProvider>
	);
}

export default StoryProvider;
