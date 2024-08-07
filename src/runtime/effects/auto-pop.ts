import { TickResult, TickResultContainer } from '../runtime-types';

export class AutoPopManager {
	affectedTree: Map<string, string[]> = new Map();
	tracked: Map<string, string> = new Map();
	private tickResultStore: TickResultContainer[] = [];

	getEntityAffectedBy(entityId: string) {
		return Array.from(this.affectedTree, ([effectId, affected]) => ({ effectId, affected }))
			.sort((a, b) => a.affected.length - b.affected.length)
			.find((e) => e.affected.includes(entityId))?.effectId;
	}

	addAffectedTree(id: string, children: string[]) {
		this.affectedTree.set(id, children);
	}

	// track(flowId: string, effectId: string, location: string) {
	//     const trackIndexKey = this.getTrackIndexKey(flowId, effectId);
	//     this.tickResultStore.set(trackIndexKey, []);
	//     this.tracked.set(trackIndexKey, location);
	// }

	// getTracked(flowId: string, effectId: string) {
	//     return this.tracked.get(this.getTrackIndexKey(flowId, effectId));
	// }

	// untrack(flowId: string, effectId: string,) {
	//     const trackIndexKey = this.getTrackIndexKey(flowId, effectId);
	//     const tickResults = this.tickResultStore.get(trackIndexKey) || [];

	//     this.tickResultStore.delete(trackIndexKey);
	//     this.tracked.delete(trackIndexKey);

	//     return tickResults;
	// }

	addToTickResultStore(resultContainer: TickResultContainer) {
		resultContainer.setupInstructions.forEach((si) => {
			if (si.tickResult.type === 'constructed') {
				return;
			}
			si.tickResult.tickResponses.forEach((res) => {
				res.isAutoPop = true;
			});
		});
		resultContainer.tickResults.forEach((tr) => {
			if (tr.type === 'constructed') {
				return;
			}
			tr.tickResponses.forEach((res) => {
				res.isAutoPop = true;
			});
		});
		this.tickResultStore.push(resultContainer);
	}

	flushAllStoredTickResults() {
		const store = this.tickResultStore;
		this.tickResultStore = [];
		return store;
	}

	getActiveEffects() {
		return Array.from(this.affectedTree, ([effectId]) => effectId);
	}

	private getTrackIndexKey(flowId: string, effectId: string) {
		return `${flowId}.${effectId}`;
	}
}
