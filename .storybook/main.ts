import { withoutVitePlugins } from '@storybook/builder-vite';
import type { StorybookConfig } from '@storybook/react-vite';
import { devkitPlugin } from '../tools/devkit/storybook-plugin';

const devkitEnabled = process.env.SIMULACRUM_DEVKIT === '1';
const config: StorybookConfig = {
	staticDirs: devkitEnabled
		? [{ from: '../node_modules/monaco-editor/min', to: '/devkit-monaco' }]
		: [],
	stories: devkitEnabled
		? ['../tools/devkit/session.stories.tsx']
		: ['../src/**/*.mdx', '../src/**/*.stories.@(js|jsx|ts|tsx)'],
	async viteFinal(config) {
		if (devkitEnabled) {
			// Storybook inherits library plugins, but this fixture needs no declarations.
			config.plugins = [
				...(await withoutVitePlugins(config.plugins, ['vite:dts'])),
				devkitPlugin(),
			];
			// The static observation fixture does not need Storybook's full bundle maps.
			config.build = { ...config.build, sourcemap: false };
		}
		return config;
	},
	addons: [
		'@storybook/addon-links',
		'@storybook/addon-essentials',
		'@storybook/addon-interactions',
	],
	framework: {
		name: '@storybook/react-vite',
		options: {},
	},
	docs: {
		autodocs: 'tag',
	},
};
export default config;
