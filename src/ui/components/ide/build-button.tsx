import { DefaultProps, MantineStyleSystemProps } from '@mantine/core';
import { TbPlaystationTriangle } from 'react-icons/tb';
import { useCodeDaemon } from '../../state-managers/code-daemon/code-daemon.store';
import { useCommands } from '../../commands/use-command.hook';
import ButtonComponent from '../button/button.component';
import { useHost } from '../../state-managers/host/host.store';

export default function (
	props: {
		style?: DefaultProps['style'];
	} & MantineStyleSystemProps
) {
	const { sendBuildCommand, setBuildAsErrored, build } = useCodeDaemon((state) => ({
		setBuildAsErrored: state.setBuildAsErrored,
		sendBuildCommand: state.sendBuildCommand,
		stores: state.stores,
		build: state.build,
	}));

	const emitAnalyticsEvent = useHost((state) => state.emitAnalyticsEvent);

	const {
		ide: { getErrorsFromMonacoWorker },
	} = useCommands();

	return (
		<ButtonComponent
			icon={<TbPlaystationTriangle size={'18px'} />}
			loading={build.state === 'processing'}
			onClick={async () => {
				emitAnalyticsEvent('build-button.pressed');
				const errors = await getErrorsFromMonacoWorker();
				if (errors.length) {
					setBuildAsErrored(errors);
					emitAnalyticsEvent('build.errored', { source: 'monaco' });
					return;
				}
				sendBuildCommand();
			}}
			style={props.style}
			{...props}
		>
			Build
		</ButtonComponent>
	);
}
