import { fileURLToPath } from 'node:url';
import type { Plugin } from 'vite';

// Instrument the development host without adding debug hooks to published source.
export function devkitPlugin(): Plugin {
	const hostPath = fileURLToPath(
		new URL('../../src/ui/state-managers/host/host.store.ts', import.meta.url)
	);
	const bridgePath = fileURLToPath(new URL('./bridge.ts', import.meta.url));
	return {
		name: 'simulacrum-devkit',
		enforce: 'pre',
		transform(source, id) {
			if (id.split('?')[0] !== hostPath) return;
			const marker = 'export const createHostStore =';
			if (!source.includes(marker)) {
				throw new Error('Devkit host instrumentation no longer matches createHostStore');
			}
			return {
				code:
					`import { registerHost } from ${JSON.stringify(bridgePath)};\n` +
					source.replace(marker, 'const createHostStoreOriginal =') +
					'\nexport const createHostStore = (...args: Parameters<typeof createHostStoreOriginal>) => registerHost(createHostStoreOriginal(...args));\n',
				map: null,
			};
		},
	};
}
