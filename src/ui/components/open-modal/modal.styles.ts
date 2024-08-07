import { CSSObject } from '@emotion/react';
import { ButtonProps, ModalBaseStylesNames, Styles } from '@mantine/core';

export const ModalStyles: Styles<ModalBaseStylesNames> = {
	content: {
		borderRadius: '10px',
		border: '2px solid #1f1f1f',
	},
	header: {
		backgroundColor: 'rgb(9,9,11)',
	},

	title: {
		fontWeight: 700,
		fontSize: '18px',
	},

	body: {
		backgroundColor: 'rgb(9,9,11)',
	},
};

export const ConfirmButtonStyle: (ButtonProps &
	React.ComponentPropsWithoutRef<'button'>)['styles'] = {
	root: {
		backgroundColor: 'black',
		color: 'white',
		border: '1px solid white',
		borderRadius: '3px',
		'&:hover': {
			color: '#113afc',
			backgroundColor: 'white',
		},

		'&:active': {
			color: '#113afc',
			backgroundColor: 'white',
		},
	},
};

export const CancelButtonStyle: (ButtonProps & React.ComponentPropsWithoutRef<'button'>)['styles'] =
	{
		root: {
			backgroundColor: 'white',
			color: 'black',
			border: '1px solid white',
			borderRadius: '3px',
			'&:hover': {
				color: '#00a2dd',
				backgroundColor: 'black',
			},

			'&:active': {
				color: '#00a2dd',
				backgroundColor: 'black',
			},
		},
	};
