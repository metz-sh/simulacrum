import { StoreApi } from 'zustand';
import { HostState } from '../../state-managers/host/host.state';
import { getProjectStore } from '../get-stores.util';
import { type ProjectState } from '../../state-managers/project/project.state';
import { fileSystemTreeToArray } from '../../common/file-system/utils';

function parseProject(state: ProjectState) {
	return {
		name: state.name,
		version: state.version,
		files: fileSystemTreeToArray(state.fileSystemTree),
	};
}

export default function subscribeToProjectState(hostStore: StoreApi<HostState>) {
	const projectStore = getProjectStore(hostStore);
	const subject = hostStore.getState().getHostSubject<'project'>();
	projectStore.subscribe((newState) => {
		subject.next({
			source: 'project',
			newState: parseProject(newState).files,
		});
	});
}
