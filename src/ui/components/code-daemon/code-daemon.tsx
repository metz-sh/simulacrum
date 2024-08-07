import { type ReactNode, useEffect } from 'react';
import { CodeDaemonContext } from '../../state-managers/code-daemon/code-daemon.store';
import { CodeDaemonState } from '../../state-managers/code-daemon/code-daemon-types';
import { StoreApi } from 'zustand';
import { LoadingOverlay } from '@mantine/core';
import { useHost } from '../../state-managers/host/host.store';
import { Keywords } from '../../../compiler/compiler-types';
import { useCommands } from '../../commands/use-command.hook';
import { CallHierarchyContainer } from '../../../compiler/command-handlers/build-command/call-hierarchy-parser';
import { CompilerService } from '../../../compiler/compiler.service';
import { CompilerCommand } from '../../../compiler/compiler-types';

export default function CodeDaemon(props: {
	projectName: string;
	store: StoreApi<CodeDaemonState>;
	children: ReactNode;
}) {
	const { store } = props;
	const {
		ide: { setErrorMarkers, clearAllErrorMarkers },
	} = useCommands();
	const emitAnalyticsEvent = useHost((state) => state.emitAnalyticsEvent);

	useEffect(() => {
		new CompilerService(
			props.projectName,
			(initializedCompilerService) => {
				store.getState().setCompilerService(initializedCompilerService);
			},
			(fsMap: Map<string, string>) => {
				store.setState({
					compiledProject: fsMap,
					compiledProjectVersion: store.getState().compiledProjectVersion + 1,
				});
			},
			async (fsMap: Map<string, string>, tag) => {
				const callHierarchyContainer = JSON.parse(
					fsMap.get('call-hierarchy-container.json')!
				) as CallHierarchyContainer;
				const keywords = JSON.parse(fsMap.get('keywords.json')!) as Keywords;
				const bundle = fsMap.get('bundle.js')!;
				const newBuild = {
					state: 'built',
					artificats: {
						projectVersion: tag as number,
						bundle,
						keywords,
						callHierarchyContainer,
					},
				} as const;
				const isDifferentThanBefore = store
					.getState()
					.getIfBuildIsDifferentThanBefore(newBuild);

				store.getState().setBuild({
					...newBuild,
					isDifferentThanBefore,
				});
				emitAnalyticsEvent('build.succeeded', { bundleSize: bundle.length });
			},
			(fsMap: Map<string, string>, tag) => {
				const keywords = JSON.parse(fsMap.get('keywords.json')!) as Keywords;
				const callHierarchyContainer = JSON.parse(
					fsMap.get('call-hierarchy-container.json')!
				) as CallHierarchyContainer;
				store.setState({
					preview: {
						state: 'built',
						artificats: {
							projectVersion: tag as number,
							keywords,
							callHierarchyContainer,
						},
					},
				});
				clearAllErrorMarkers();
				if (store.getState().build.state === 'errored') {
					store.getState().setBuild({
						state: 'uninitiated',
					});
				}
			},
			({ responseFor, errors }) => {
				if (responseFor == CompilerCommand.BUILD) {
					store.setState({
						build: {
							state: 'errored',
							errors,
						},
					});
					setErrorMarkers(errors.filter((e) => e.sourceable));
					emitAnalyticsEvent('build.errored', { source: 'build_command' });
				}
				if (responseFor == CompilerCommand.BUILD_PREVIEW) {
					store.setState({
						preview: {
							state: 'errored',
							errors,
						},
					});
					setErrorMarkers(errors.filter((e) => e.sourceable));
					emitAnalyticsEvent('build.errored', { source: 'build_preview_command' });
				}
			}
		);
	}, []);

	return (
		<>
			{!store && (
				<LoadingOverlay
					loaderProps={{ size: 'md', color: 'white', variant: 'oval' }}
					visible={!store}
					opacity={0.8}
					overlayColor="#000"
				/>
			)}
			{store && (
				<CodeDaemonContext.Provider value={store}>
					{props.children}
				</CodeDaemonContext.Provider>
			)}
		</>
	);
}
