import { Meta, StoryObj } from '@storybook/react';

import { MantineProvider } from '@mantine/core';
import NotesComponent from '../notes.component';

const meta: Meta<typeof NotesComponent> = {
	title: 'components/notes',
};
export default meta;

type Story = StoryObj<typeof NotesComponent>;

export const notes: Story = {
	render: () => {
		return (
			<MantineProvider
				withGlobalStyles
				withNormalizeCSS
				theme={{
					colorScheme: 'dark',
					globalStyles: (theme) => ({
						body: {
							backgroundColor: 'rgb(6,6,12)',
							overflow: 'hidden',
						},
						pre: {
							backgroundColor: 'inherit !important',
							color: '#C1C2C5 !important',
						},
					}),
					headings: {
						fontWeight: 800,
						fontFamily: 'Space Grotesk',
					},
					fontFamily: 'strawfordregular',
				}}
			>
				<NotesComponent content="<h1>Start Wortking</h1>" onUpdate={() => {}} />
			</MantineProvider>
		);
	},
};
