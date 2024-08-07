import { Box, Flex, Paper, ScrollArea, Text, createStyles } from '@mantine/core';
import { Flow } from '../../../runtime/runtime-types';
import LogRenderer from '../node-debug-console/log-renderer';

const useStyles = createStyles((theme) => ({
	paperRoot: {
		backgroundColor: 'rgb(6,6,12)',
		display: 'flex',
		flexDirection: 'column',
		gap: '20px',
	},

	item: {
		backgroundColor: 'rgb(11,11,19)',
		'&[data-active]': {
			backgroundColor: 'rgb(11,11,19)',
		},
	},

	content: {
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
	},
}));

export default function (props: { flow: Flow; logs: any[] }) {
	const { classes } = useStyles();
	return (
		<Paper
			shadow="md"
			withBorder
			p={'lg'}
			radius={'md'}
			className={classes.paperRoot}
			miw={130}
			w={'100%'}
		>
			<Paper
				pt={5}
				pb={5}
				radius={'md'}
				style={{
					backgroundColor: 'inherit',
				}}
			>
				<Box>
					<Text ff={'Fira Mono'} fz={10}>
						Flow:
					</Text>
					<Text
						ff={'Fira Mono'}
						variant="gradient"
						gradient={{ from: 'cyan', to: 'teal', deg: 45 }}
						fz={14}
					>
						{props.flow.name}
					</Text>
				</Box>
			</Paper>
			<ScrollArea className="nowheel" w={'100%'} h={'100%'}>
				<LogRenderer logs={props.logs} disableContinueButton={true} />
			</ScrollArea>
		</Paper>
	);
}
