import { resolve } from 'node:path';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import tsConfigPaths from 'vite-tsconfig-paths';

// https://vitejs.dev/config/
export default defineConfig((configEnv) => ({
	plugins: [
		react(),
		tsConfigPaths(),
		dts({
			include: ['src/'],
		}),
	],
	build: {
		minify: true,
		lib: {
			entry: resolve('src', 'index.tsx'),
			name: '@metz/simulacrum',
			formats: ['es'],
			fileName: (format) => `index.js`,
		},
		rollupOptions: {
			external: ['react', 'react-dom'],
			output: {
				globals: {
					react: 'React',
					'react-dom': 'ReactDOM',
				},
			},
		},
	},
}));
