import type { Meta, StoryObj } from '@storybook/react';
import { Editor } from '../../src/index';
import { loader } from '@monaco-editor/react';

// Keep the isolated fixture independent of Monaco's default external CDN.
loader.config({ paths: { vs: '/devkit-monaco/vs' } });

const meta: Meta<typeof Editor> = {
	title: 'devkit/session',
	component: Editor,
	parameters: { layout: 'fullscreen' },
};
export default meta;

export const Default: StoryObj<typeof Editor> = {
	args: {
		projectName: 'Devkit Counter',
		height: '100vh',
		enableModalProvider: true,
		project: [
			{
				type: 'file',
				path: 'app/counter.ts',
				value: `@Injectable
class Counter {
	@Show
	value = 0;

	increment() {
		this.value += 1;
		return this.value;
	}
}
`,
			},
		],
		storySetups: [
			{
				id: 'counter-increment',
				title: 'Increment counter',
				script: {
					raw: "const counter = std.resolve(Counter);\nstd.flow('Increment', counter).increment().run();",
					compiled:
						"const counter = std.resolve(Counter);\nstd.flow('Increment', counter).increment().run();",
				},
			},
		],
	},
};
