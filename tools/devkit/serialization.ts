// Observation only: never call modeled getters, toJSON, iterators, or coercion hooks.
// Proxies can still trap reflection; this is not an untrusted-code sandbox.
export type SnapshotValue =
	| null
	| boolean
	| number
	| string
	| SnapshotValue[]
	| {
			[key: string]: SnapshotValue;
	  };

export const observationLimits = {
	depth: 6,
	entries: 50,
	nodes: 1000,
	string: 2000,
	characters: 20000,
} as const;

/** Plain JSON-safe copies. Markers are descriptive strings, not model values.
 * Maps/Sets use {$type, entries/values, truncated}; object truncation uses
 * $truncated. Accessors are represented by [Accessor], never evaluated.
 * A serializer shares its node/string budget across all values passed to it.
 */
export function createSerializer() {
	let remainingNodes: number = observationLimits.nodes;
	let remainingCharacters: number = observationLimits.characters;
	const ancestors = new WeakSet<object>();
	function text(value: string) {
		const limit = Math.min(observationLimits.string, remainingCharacters);
		remainingCharacters -= Math.min(value.length, limit);
		return value.length > limit ? value.slice(0, limit) + '[Truncated]' : value;
	}
	function visit(value: unknown, depth: number): SnapshotValue {
		if (remainingNodes-- <= 0) return '[Truncated]';
		if (value === null || typeof value === 'boolean') return value;
		if (typeof value === 'string') return text(value);
		if (typeof value === 'number') return Number.isFinite(value) ? value : String(value);
		if (typeof value === 'undefined') return '[Undefined]';
		if (typeof value === 'bigint') return '[BigInt]';
		if (typeof value === 'symbol') return '[Symbol]';
		if (typeof value === 'function') return '[Function]';
		if (ancestors.has(value)) return '[Circular]';
		if (depth >= observationLimits.depth) return '[Truncated]';
		ancestors.add(value);
		try {
			// Native intrinsics bypass overridden instance methods and size getters.
			for (const kind of ['Map', 'Set'] as const) {
				let iterator: Iterator<unknown>;
				try {
					iterator =
						kind === 'Map'
							? Map.prototype.entries.call(value)
							: Set.prototype.values.call(value);
				} catch {
					continue;
				}
				const entries: SnapshotValue[] = [];
				let next = iterator.next();
				while (
					!next.done &&
					entries.length < observationLimits.entries &&
					remainingNodes > 0
				) {
					entries.push(visit(next.value, depth + 1));
					next = iterator.next();
				}
				return {
					$type: kind,
					[kind === 'Map' ? 'entries' : 'values']: entries,
					truncated: !next.done,
				};
			}
			if (Array.isArray(value)) {
				const length = Object.getOwnPropertyDescriptor(value, 'length')!.value as number;
				const result: SnapshotValue[] = [];
				for (
					let i = 0;
					i < Math.min(length, observationLimits.entries) && remainingNodes > 0;
					i++
				) {
					const descriptor = Object.getOwnPropertyDescriptor(value, String(i));
					result.push(
						!descriptor
							? '[Empty]'
							: 'value' in descriptor
								? visit(descriptor.value, depth + 1)
								: '[Accessor]'
					);
				}
				if (result.length < length) result.push('[Truncated]');
				return result;
			}
			const result: { [key: string]: SnapshotValue } = {};
			const keys = Object.getOwnPropertyNames(value);
			let count = 0;
			for (const key of keys) {
				if (
					count >= observationLimits.entries ||
					remainingNodes <= 0 ||
					remainingCharacters < key.length
				)
					break;
				remainingCharacters -= key.length;
				const descriptor = Object.getOwnPropertyDescriptor(value, key);
				if (!descriptor) continue;
				Object.defineProperty(result, key, {
					value:
						'value' in descriptor ? visit(descriptor.value, depth + 1) : '[Accessor]',
					enumerable: true,
					configurable: true,
					writable: true,
				});
				count++;
			}
			if (count < keys.length)
				Object.defineProperty(result, '$truncated', {
					value: true,
					enumerable: true,
					configurable: true,
				});
			return result;
		} catch {
			return '[Uninspectable]';
		} finally {
			ancestors.delete(value);
		}
	}
	return (value: unknown) => visit(value, 0);
}

/** Resolve class metadata through descriptors, without reading constructor getters. */
export function observedClassName(value: object): string | null {
	try {
		let current: object | null = value;
		for (let depth = 0; current && depth < observationLimits.depth; depth++) {
			const descriptor = Object.getOwnPropertyDescriptor(current, 'constructor');
			if (descriptor) {
				if (!('value' in descriptor) || typeof descriptor.value !== 'function') return null;
				const name = Object.getOwnPropertyDescriptor(descriptor.value, 'name');
				return name && 'value' in name && typeof name.value === 'string'
					? name.value.slice(0, observationLimits.string)
					: null;
			}
			current = Object.getPrototypeOf(current);
		}
	} catch {
		/* Reflection on a revoked proxy can fail. */
	}
	return null;
}
