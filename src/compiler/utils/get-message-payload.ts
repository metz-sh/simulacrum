import { encodeMap } from '../../ui/services/map-converter';

export function getFSPayload(fs: Map<string, string>) {
	const payload = encodeMap(fs);

	const transferrable = (() => {
		const acc: ArrayBuffer[] = [];
		for (const elem of payload) {
			acc.push(elem[0].buffer);
			acc.push(elem[1].buffer);
		}
		return acc;
	})();

	return {
		payload,
		transferrable,
	};
}
