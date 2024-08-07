import { Meta, StoryObj } from '@storybook/react';

import { MantineProvider } from '@mantine/core';
import NotesModalComponent from './notes-modal.component';

const meta: Meta<typeof NotesModalComponent> = {
	title: 'components/notes-modal',
};
export default meta;

type Story = StoryObj<typeof NotesModalComponent>;

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
				<NotesModalComponent />
			</MantineProvider>
		);
	},
};
