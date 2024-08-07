export class DIContainer {
	private map = new Map<string, any>();

	getFromMap(key: string) {
		return this.map.get(key);
	}

	set(key: new () => any, value: any) {
		this.map.set(key.name, value);
	}

	loadClassess(classes: (new () => any)[]) {
		const classesToRetry: (new () => any)[] = [];
		classes.forEach((classReference) => {
			try {
				this.set(classReference, new classReference());
			} catch (error) {
				classesToRetry.push(classReference);
			}
		});

		try {
			classesToRetry.reverse().forEach((classReference) => {
				this.set(classReference, new classReference());
			});
		} catch (error: any) {
			throw new Error(error.message, { cause: 'POSSIBLE_CYCLE' });
		}
	}

	get(key: string) {
		const map = this.map;
		return new Proxy({} as any, {
			get(target, p, receiver) {
				const resource = map.get(key);
				if (!resource) {
					throw new Error(`Resource not found in DI container: ${key}`, {
						cause: 'NOT_FOUND',
					});
				}
				return resource[p];
			},
			set(target, p, newValue, receiver) {
				const resource = map.get(key);
				if (!resource) {
					throw new Error(`Resource not found in DI container: ${key}`, {
						cause: 'NOT_FOUND',
					});
				}
				resource[p] = newValue;
				return true;
			},
		});
	}
}
