import { useEffect, useState } from 'react';
import { FlowPlayerMode } from '../../models/flow-player';
import { RenderEngine } from '../../services/render-engine/render-engine';
import { useStory } from '../../state-managers/story/story.store';
import { ReactFlowInstance } from 'reactflow';

export default function (props: {
	renderEngine: RenderEngine;
	reactFlowInstance: ReactFlowInstance;
}) {
	const [drawCount, setDrawCount] = useState(0);
	const { consumeRenderToken, flowPlayerProps, isFinished, returnRenderToken, setRuntimeError } =
		useStory((state) => ({
			consumeRenderToken: state.consumeRenderToken,
			returnRenderToken: state.returnRenderToken,
			flowPlayerProps: state.flowPlayerProps,
			isFinished: state.isFinished,
			setRuntimeError: state.setRuntimeError,
		}));
	useEffect(() => {
		if (isFinished) {
			return;
		}
		if (flowPlayerProps.mode !== 'auto') {
			return;
		}
		(async () => {
			const token = consumeRenderToken();
			if (!token) {
				console.error('Tried rendering but no token');
				return;
			}
			await props.renderEngine.render(token);
			returnRenderToken(token);
			setDrawCount(drawCount + 1);
		})().catch(setRuntimeError);
	}, [drawCount, flowPlayerProps.mode, isFinished]);

	useEffect(() => {
		(async () => {
			const token = consumeRenderToken();
			if (!token) {
				console.error('Tried rendering but no token');
				return;
			}
			await props.renderEngine.render(token);
			returnRenderToken(token);
		})().catch(setRuntimeError);
	}, []);

	return <></>;
}
