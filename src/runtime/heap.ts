import objectHash from 'object-hash';

export type Allocatable = {
	__starting_address: string;
	constructor: {
		name: string;
	};
};

export type Address = {
	startingAddress: string;
	// For now, this is where we will store the method name. So a combination of address,
	// and offset gives a precise idea of entity we are dealing with. For example:
	// { address: '0', offset: 'read' } tells we need to operate on method 'read' of instance on '0'
	offset: string;
};

export function createLocationFromAddress(address: Address) {
	return `${address.startingAddress}.${address.offset}`;
}

export class Heap {
	private addressInstanceMap = new Map<string, Allocatable>();
	private addressTranslationMap = new Map<string, string>();
	private hashCountMap = new Map<string, number>();

	private getHash(allocatable: Allocatable) {
		const seed = {
			className: allocatable.constructor.name,
			members: Object.values(allocatable),
		};
		return objectHash.MD5(seed);
	}

	private buildAddressForHeapMember(instance: Allocatable, hash: string) {
		const hashCount = (() => {
			const count = this.hashCountMap.get(hash);
			if (count === undefined) {
				this.hashCountMap.set(hash, 0);
				return 0;
			}

			return count;
		})();

		const salt = hashCount + 1;
		this.hashCountMap.set(hash, salt);

		return `${hash}_${salt}`;
	}

	allocate(instance: Allocatable) {
		const hash = this.getHash(instance);
		const startingAddress = this.buildAddressForHeapMember(instance, hash);
		this.addressInstanceMap.set(startingAddress, instance);
		return startingAddress;
	}

	list() {
		return Array.from(this.addressInstanceMap, ([address, instance]) => ({
			address,
			instance,
		}));
	}

	translateAddress(location: string) {
		const entry = this.addressTranslationMap.get(location);
		if (!entry) {
			throw new Error(`Page fault. No such address found! ${location}`);
		}

		return entry;
	}

	canTranslateAddress(location: string) {
		return this.addressTranslationMap.has(location);
	}

	setAddressTranslation(location: string, realAddress: string) {
		this.addressTranslationMap.set(location, realAddress);
	}

	getInstanceFromAddress(address: string) {
		return this.addressInstanceMap.get(address);
	}

	reset() {
		this.addressInstanceMap.clear();
		this.addressTranslationMap.clear();
		this.hashCountMap.clear();
	}
}
