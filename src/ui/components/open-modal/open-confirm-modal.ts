import { modals } from '@mantine/modals';
import { CancelButtonStyle, ConfirmButtonStyle, ModalStyles } from './modal.styles';
import { MantineNumberSize } from '@mantine/core';

export const openConfirmModal = (props: {
	title: string;
	children: React.ReactNode;
	onConfirm: () => void;
	size?: MantineNumberSize;
}) =>
	modals.openConfirmModal({
		size: props.size || 'md',
		title: props.title,
		children: props.children,
		labels: { confirm: 'Confirm', cancel: 'Cancel' },
		onCancel: () => {},
		onConfirm: () => props.onConfirm(),
		centered: true,
		styles: ModalStyles,
		confirmProps: {
			styles: ConfirmButtonStyle,
		},
		cancelProps: {
			styles: CancelButtonStyle,
		},
		trapFocus: false,
	});
