import { Box, Button, ButtonProps, Flex, Group, ThemeIcon, createStyles } from '@mantine/core';
import { useHover } from '@mantine/hooks';
import { motion, useAnimate } from 'framer-motion';
import { forwardRef, useEffect } from 'react';

const rootVariants = {
	inactive: {
		scale: 1,
	},
	hovered: {
		scale: 1.1,
		transition: {
			when: 'beforeChildren',
			staggerChildren: 0.05,
		},
	},
	active: {
		scale: 1.1,
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
		scale: 1.1,
		backgroundColor: '#101010',
		borderRadius: '4px',
		color: '#fff',
		y: '-2px',
	},
	active: {
		scale: 1.1,
		y: '2px',
	},
};

function Icon(props: { children: React.ReactNode; hovered?: boolean }) {
	const [scope, animate] = useAnimate();
	useEffect(() => {
		if (props.hovered) {
			animate(scope.current, iconVariants.hovered);
		} else {
			animate(scope.current, iconVariants.inactive);
		}
	}, [props.hovered]);
	return (
		<motion.div
			ref={scope}
			variants={iconVariants}
			style={{
				display: 'flex',
				justifyContent: 'center',
				padding: '4px',
			}}
		>
			{props.children}
		</motion.div>
	);
}

type Props = import('@mantine/utils').PolymorphicComponentProps<'button', ButtonProps>;

function _ButtonComponent(
	props: Props & {
		icon: React.ReactNode;
	}
) {
	const { hovered, ref } = useHover();

	return (
		<Flex w={props.w} ref={ref}>
			<motion.div
				variants={rootVariants}
				initial="inactive"
				whileHover="hovered"
				whileTap="active"
				transition={{
					duration: 0.125,
				}}
				style={
					props.w
						? {
								width: props.w as string,
							}
						: {}
				}
			>
				<Button
					radius={8}
					sx={{
						backgroundColor: 'black',
						color: 'white',
						border: '1px solid white',

						'&:hover': {
							color: '#113afc',
							backgroundColor: 'white',
						},

						'&:active': {
							color: '#113afc',
							backgroundColor: 'white',
						},
					}}
					{...props}
					leftIcon={<Icon hovered={hovered}>{props.icon}</Icon>}
				/>
			</motion.div>
		</Flex>
	);
}

export default forwardRef<HTMLDivElement, Parameters<typeof _ButtonComponent>[0]>((props, ref) => {
	return (
		<Box ref={ref} w={props.w}>
			<_ButtonComponent {...props} />
		</Box>
	);
});
