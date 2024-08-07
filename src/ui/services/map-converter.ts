const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function encodeMap(params: Map<string, string>) {
	const result: [Uint8Array, Uint8Array][] = [];

	for (const entry of params.entries()) {
		result.push([encoder.encode(entry[0]), encoder.encode(entry[1])]);
	}

	return result;
}

export function decodeToMap(params: [Uint8Array, Uint8Array][]) {
	const result = new Map<string, string>();

	for (const entry of params) {
		result.set(decoder.decode(entry[0]), decoder.decode(entry[1]));
	}

	return result;
}
