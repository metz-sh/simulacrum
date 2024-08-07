import { ReactFlowProvider } from 'reactflow';
import 'reactflow/dist/style.css';

import 'reactflow/dist/base.css';
import '../reactflow/reactflow.css';

import { memo } from 'react';
import { EntryPoint } from '../../ui-types';
import Story from '../story/story.component';

const StoryWrapper = memo((props: { namespace: string; height?: string }) => {
	return <Story namespace={props.namespace} height={props.height} />;
});

function StoryProvider(props: { namespace: string; firstNodeData?: EntryPoint; height?: string }) {
	const { namespace, height } = props;

	// const {loadFromMap, edgeMap, nodeMap} = useStory(state => ({ initialize: state.initialize, }));

	// const {
	//     edgeMap,
	//     nodeMap,
	//   } = useDisplay(selector => ({
	//     edgeMap: selector.edgeMap,
	//     nodeMap: selector.nodeMap,
	//   }));

	// useEffect(
	//     () => {

	//       loadFromMap(
	//         edgeMap, nodeMap
	//       )
	//     },
	//     []
	// )

	return (
		<ReactFlowProvider>
			<StoryWrapper namespace={namespace} height={height} />
		</ReactFlowProvider>
	);
}

export default StoryProvider;
