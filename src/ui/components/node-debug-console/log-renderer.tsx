import { createStyles } from '@mantine/core';
import { Prism } from '@mantine/prism';
import { useStory } from '../../state-managers/story/story.store';
import ButtonComponent from '../button/button.component';
import { FaPlay } from 'react-icons/fa';
import { parseNonPrimitive } from './utils/parse-non-primitive';

const useStyles = createStyles((theme) => ({
	logs: {
		display: 'flex',
		flexDirection: 'column',
		gap: '10px',
	},

	continue: {
		marginTop: '25px',
		marginBottom: '5px',
	},
}));

export default function LogRenderer(props: { logs: any[]; disableContinueButton?: boolean }) {
	const { classes } = useStyles();
	const { cyclePlayerMode, flowPlayerState } = useStory((state) => ({
		cyclePlayerMode: state.cycleFlowPlayerMode,
		flowPlayerState: state.flowPlayerProps,
	}));
	const { logs } = props;

	return (
		<div className={classes.logs}>
			{logs.map((log, index) => (
				<Prism key={index} noCopy language={'tsx'}>
					{parseNonPrimitive(log)}
				</Prism>
			))}
			{!props.disableContinueButton && flowPlayerState.mode === 'manual' && (
				<div className={classes.continue}>
					<ButtonComponent icon={<FaPlay />} onClick={cyclePlayerMode}>
						Continue
					</ButtonComponent>
				</div>
			)}
		</div>
	);
}
