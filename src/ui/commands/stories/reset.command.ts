import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getDisplayStore, getStoryStore } from '../get-stores.util';
import { RenderEngine } from '../../services/render-engine/render-engine';
import { hydrateStoryScriptFromStore } from './hydrate-raw-story.command';
import { getBuild, getBuiltArtifacts } from '../code-daemon/get-built-artifacts.command';
import { Bootloader } from '../../services/bootloader/bootloader.service';
import { getLayoutedNodes } from '../layout/get-layouted-nodes.command';

export async function reset(
	hostStore: StoreApi<HostState>,
	params: {
		storyId: string;
		renderEngine: RenderEngine;
	}
) {
	const storyStore = getStoryStore(hostStore, params.storyId);
	const { consumeRenderToken, reset, returnRenderToken } = storyStore.getState();

	//render reset
	const token = consumeRenderToken();
	if (!token) {
		throw new Error('No token for rendering reset!');
	}
	await params.renderEngine.reset(token);

	//reset everything
	reset();

	//rebuild everything
	const build = getBuild(hostStore);
	const bootloader = new Bootloader(
		storyStore.getState().runtime,
		hostStore.getState().baseProps.projectName,
		storyStore.getState().id,
		build
	);
	const { nodes, edges } = await bootloader.boot();
	const layoutedNodes = await getLayoutedNodes(hostStore, {
		atRuntime: false,
		resolution: storyStore.getState().resolution,
		projectName: hostStore.getState().baseProps.projectName,
		projectVersion: build.artificats.projectVersion,
		isBuildDifferentThanBefore: build.isDifferentThanBefore,
		nodes,
		edges,
	});
	storyStore.setState({
		nodes: layoutedNodes,
		edges,
	});
	await storyStore
		.getState()
		.setResolutionAndRefreshPrimordials(storyStore.getState().resolution);

	//re-intialize
	hydrateStoryScriptFromStore(hostStore, params.storyId);

	await params.renderEngine.render(token);

	returnRenderToken(token);
}
