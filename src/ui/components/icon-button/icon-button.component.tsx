import {
	ActionIcon,
	ActionIconProps,
	Box,
	Button,
	ButtonProps,
	Group,
	ThemeIcon,
	createStyles,
} from '@mantine/core';
import { useHover } from '@mantine/hooks';
import { motion, useAnimate } from 'framer-motion';
import { forwardRef, useEffect } from 'react';
import TipComponent from '../tip/tip.component';

const rootVariants = {
	inactive: {
		scale: 1,
	},
	hovered: {
		scale: 1.3,
		transition: {
			when: 'beforeChildren',
			staggerChildren: 0.05,
		},
	},
	active: {
		scale: 1.3,
	},
};

const minimalrootVariants = {
	inactive: {
		scale: 1,
	},
	hovered: {
		scale: 1,
		transition: {
			when: 'beforeChildren',
			staggerChildren: 0.005,
		},
		y: '-1.1px',
	},
	active: {
		scale: 1,
	},
};

const iconVariants = {
	inactive: {
		scale: 1,
		backgroundColor: '#000',
		borderRadius: '4px',
		color: '#fff',
		y: '0px',
	},
	hovered: {
		scale: 1,
		backgroundColor: '#101010',
		borderRadius: '4px',
		color: '#fff',
		y: '-2px',
	},
	active: {
		scale: 1,
		y: '2px',
	},
};

const minimalIconVariants = {
	inactive: {
		scale: 1,
		backgroundColor: 'inherit',
		borderRadius: '4px',
		color: '#fff',
		y: '0px',
	},
	hovered: {
		scale: 1,
		// y: '0px',
		backgroundColor: '#fff',
		borderRadius: '8px',
		color: '#000',
		y: '-1.05px',
	},
	active: {
		scale: 1,
		y: '1.1px',
	},
};

function Icon(props: { children: React.ReactNode; hovered: boolean; minimal?: boolean }) {
	const variants = props.minimal ? minimalIconVariants : iconVariants;
	const [scope, animate] = useAnimate();
	useEffect(() => {
		if (props.hovered) {
			animate(scope.current, variants.hovered, { duration: 0.075 });
		} else {
			animate(scope.current, variants.inactive, { duration: 0.075 });
		}
	}, [props.hovered]);
	return (
		<motion.div
			ref={scope}
			variants={variants}
			style={{
				display: 'flex',
				justifyContent: 'center',
				padding: props.minimal ? '2px' : '5px',
			}}
		>
			{props.children}
		</motion.div>
	);
}

type Props = import('@mantine/utils').PolymorphicComponentProps<'button', ActionIconProps>;

export function _IconButton(
	rawProps: Props & {
		icon: React.ReactNode;
		tip?: string;
		minimal?: boolean;
	}
) {
	const { minimal, tip, ...props } = rawProps;
	const variants = minimal ? minimalrootVariants : rootVariants;
	const { hovered, ref } = useHover();
	let root = (
		<ActionIcon
			radius={8}
			sx={{
				backgroundColor: minimal ? 'inherit' : 'black !important',
				color: 'white !important',
				border: !minimal ? '1px solid white !important' : 'none',

				...(minimal
					? {
							'&:hover': {
								backgroundColor: 'black !important',
							},

							'&:active': {
								backgroundColor: 'black !important',
							},
						}
					: {
							'&:hover': {
								backgroundColor: 'white !important',
							},

							'&:active': {
								backgroundColor: 'white !important',
							},
						}),
			}}
			p={minimal ? 5 : 15}
			{...props}
		>
			<Icon hovered={hovered} minimal={minimal}>
				{props.icon}
			</Icon>
		</ActionIcon>
	);

	if (tip) {
		root = <TipComponent text={tip}>{root}</TipComponent>;
	}

	return (
		<Box ref={ref}>
			<motion.div
				variants={variants}
				initial="inactive"
				whileHover="hovered"
				whileTap="active"
				transition={{
					duration: minimal ? 0.075 : 0.125,
				}}
			>
				{root}
			</motion.div>
		</Box>
	);
}

export default forwardRef<HTMLDivElement, Parameters<typeof _IconButton>[0]>((rawProps, ref) => {
	const { minimal, ...props } = rawProps;
	if (props.disabled) {
		return (
			<Box ref={ref}>
				<ActionIcon
					radius={8}
					sx={{
						backgroundColor: minimal ? 'inherit' : 'black !important',
						color: 'white !important',
						border: !minimal ? '1px solid white !important' : 'none',
					}}
					p={minimal ? 5 : 15}
					{...props}
				>
					{props.icon}
				</ActionIcon>
			</Box>
		);
	}
	return (
		<Box ref={ref}>
			<_IconButton {...rawProps} />
		</Box>
	);
});
