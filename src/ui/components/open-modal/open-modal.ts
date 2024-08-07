import { modals } from '@mantine/modals';
import { ModalStyles } from './modal.styles';
import { MantineNumberSize } from '@mantine/core';

export const openModal = (props: {
	title?: string;
	children: React.ReactNode;
	size?: MantineNumberSize;
}) =>
	modals.open({
		size: props.size || 'md',
		title: props.title,
		children: props.children,
		centered: true,
		styles: ModalStyles,
		trapFocus: false,
	});
