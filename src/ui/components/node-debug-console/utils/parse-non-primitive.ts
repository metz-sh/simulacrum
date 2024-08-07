export function parseNonPrimitive(value: any): string {
	if (value === null) {
		return 'null';
	}

	if (value === undefined) {
		return 'undefined';
	}

	const type = typeof value;
	// Directly serialize simple primitive types
	if (type === 'number' || type === 'boolean') {
		return value.toString();
	}

	if (type === 'string') {
		return `'${value}'`;
	}

	// Convert Dates to ISO strings
	if (value instanceof Date) {
		return value.toISOString();
	}

	// Mark functions (or exclude them by returning undefined)
	if (type === 'function') {
		return `[Function: ${value.toString() || 'anonymous'}]`;
	}

	// Exclude symbols or other non-serializable types
	if (type === 'symbol') {
		return `[Symbol: ${value.toString()}]`;
	}

	if (Array.isArray(value)) {
		return JSON.stringify(value, null, 2);
	}

	if (typeof value === 'object') {
		if (value.constructor?.name) {
			return JSON.stringify(value, null, 2);
		}
	}

	if (value.constructor?.name) {
		return value.constructor.name;
	}

	return `${value}`;
}
