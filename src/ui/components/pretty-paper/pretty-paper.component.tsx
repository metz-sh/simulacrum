import { Paper, PaperProps, createStyles } from '@mantine/core';
import { forwardRef } from 'react';

const useStyles = createStyles((theme) => ({
	root: {
		border: '2px solid #27365940',
		backgroundColor: 'rgba(6,3,10)',
		borderRadius: '7px',
	},
}));

export default forwardRef(function (
	props: {
		children: React.ReactNode;
		onClick?: () => void;
	} & PaperProps,
	ref: React.ForwardedRef<any>
) {
	const { classes } = useStyles();
	return (
		<Paper
			className={classes.root}
			pl={'md'}
			pr={'md'}
			pt={'xs'}
			pb={'xs'}
			onClick={props.onClick}
			ref={ref}
			{...props}
		>
			{props.children}
		</Paper>
	);
});
