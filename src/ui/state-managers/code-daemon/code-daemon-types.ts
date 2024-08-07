import { StoreApi } from 'zustand';
import { ProjectState } from '../project/project.state';
import { IDEState } from '../ide/ide.state';
import { NotesState } from '../notes/notes.state';
import { Keyword, Keywords } from '../../../compiler/compiler-types';
import { Edge } from 'reactflow';
import { MethodNode } from '../../components/reactflow/models';
import { CallHierarchyContainer } from '../../../compiler/command-handlers/build-command/call-hierarchy-parser';
import { CompilerService } from '../../../compiler/compiler.service';
import { CompilerErrors } from '../../../compiler/compiler-types';

export type CodeDaemonState = {
	isCompilerServiceReady: boolean;
	setCompilerService: (compilerService: CompilerService) => void;
	compilerService?: CompilerService;
	getCompilerService: () => CompilerService;

	stores: {
		projectStore: StoreApi<ProjectState>;
		ideStore: StoreApi<IDEState>;
		notesStore: StoreApi<NotesState>;
	};

	useProject<T>(
		selector: (state: ProjectState) => T,
		equalityFn?: ((a: T, b: T) => boolean) | undefined
	): T;
	useIDE<T>(
		selector: (state: IDEState) => T,
		equalityFn?: ((a: T, b: T) => boolean) | undefined
	): T;
	useNotes<T>(
		selector: (state: NotesState) => T,
		equalityFn?: ((a: T, b: T) => boolean) | undefined
	): T;

	compiledProject: Map<string, string>;
	compiledProjectVersion: number;

	sendCompileCommand: () => void;
	sendBuildCommand: () => void;
	sendBuildPreviewCommand: (projectName?: string) => void;

	build:
		| ({
				state: 'uninitiated' | 'processing' | 'built' | 'errored';
		  } & {
				state: 'uninitiated' | 'processing';
		  })
		| {
				state: 'built';
				artificats: {
					projectVersion: number;
					keywords: Keyword[];
					callHierarchyContainer: CallHierarchyContainer;
					bundle: string;
				};
				isDifferentThanBefore: boolean;
		  }
		| {
				state: 'errored';
				errors: CompilerErrors;
		  };
	lastSuccessfulBuild?: CodeDaemonState['build'] & { state: 'built' };

	setBuild: (build: CodeDaemonState['build']) => void;

	preview:
		| ({
				state: 'uninitiated' | 'processing' | 'built' | 'errored';
		  } & {
				state: 'uninitiated' | 'processing';
		  })
		| {
				state: 'built';
				artificats: {
					projectVersion: number;
					keywords: Keywords;
					callHierarchyContainer: CallHierarchyContainer;
				};
		  }
		| {
				state: 'errored';
				errors: CompilerErrors;
		  };

	setPreview(preview: CodeDaemonState['preview']): void;

	setBuildAsErrored: (errors: CompilerErrors) => void;

	getIfBuildIsDifferentThanBefore: (
		newBuild: Omit<CodeDaemonState['build'] & { state: 'built' }, 'isDifferentThanBefore'>
	) => boolean;
};

export type OnCodeDameonUpdated = (params: {
	build?: CodeDaemonState['build'] & { state: 'built' };
	projectAndVersion: any;
}) => void;
