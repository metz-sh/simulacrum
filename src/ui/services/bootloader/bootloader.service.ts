import { createStandardLibrary } from '../../../std/std';
import { Runtime } from '../../../runtime/runtime';
import { PartitionedStorage } from '../../../runtime/runtime-types';
import { CodeDaemonState } from '../../state-managers/code-daemon/code-daemon-types';
import { ClassyKeywords } from '../../../compiler/compiler-types';
import { createEdgesFromNodesAndCallHierarchy } from './create-edges';
import { createNodesFromHeap } from './create-nodes';
import { createLocationFromAddress } from '../../../runtime/heap';
import { noop } from 'lodash';

// This is the helper class which works with intermediate output produced by compiler and
// creates components that reactflow can consume.
export class Bootloader {
	constructor(
		private readonly runtime: Runtime,
		private readonly projectName: string,
		private readonly namespace: string,
		private build: CodeDaemonState['build'] & { state: 'built' }
	) {}

	async boot() {
		const __runtime = this.runtime;
		const std = createStandardLibrary(this.runtime, this.projectName);
		noop(__runtime, std);
		this.runtime.reset();
		const partionedStorage = this.runtime.createPartionedStorage(this.projectName);
		const { classyKeywords }: { classyKeywords: ClassyKeywords } = eval(
			this.build.artificats.bundle
		);
		this.loadClassesInDIContainer(classyKeywords, partionedStorage);

		const heap = this.runtime.getHeap();
		const nodes = createNodesFromHeap({
			namespace: this.namespace,
			keywords: classyKeywords,
			heap,
			initHandlers: {
				onClassNode(address, node) {
					heap.setAddressTranslation(address, node.id);
				},
				onMethodNode(address, node) {
					heap.setAddressTranslation(
						createLocationFromAddress({
							startingAddress: address,
							offset: node.data.methodName,
						}),
						node.id
					);
				},
			},
		});
		const edges = createEdgesFromNodesAndCallHierarchy(
			this.namespace,
			nodes,
			this.build.artificats.callHierarchyContainer
		);

		return {
			nodes,
			edges,
		};
	}

	loadClassesInDIContainer(classyKeywords: ClassyKeywords, partionedStorage: PartitionedStorage) {
		partionedStorage.di.loadClassess(
			classyKeywords.filter((ckw) => !ckw.flags.isConstructorBased).map((ckw) => ckw.class)
		);
	}
}
