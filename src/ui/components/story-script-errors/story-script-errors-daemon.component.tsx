import { useEffect } from 'react';
import { useCommands } from '../../commands/use-command.hook';
import { useStory } from '../../state-managers/story/story.store';
import { useHost } from '../../state-managers/host/host.store';

export default function () {
	const {
		codeDaemon: { getBuiltArtifacts },
		ide: { syncMonacoModels, addFilesToMonaco, getErrorsFromMonacoWorker },
	} = useCommands();

	const emitAnalyticsEvent = useHost((state) => state.emitAnalyticsEvent);

	const { script, setErrors } = useStory((state) => ({
		script: state.script,
		setErrors: state.setErrors,
	}));

	/**
	 * We mount a fake entrypoint whenever script changes beacuse:
	 * 1. The real script becomes part of monaco IFF story script modal is opened
	 * 2. On close, the real script gets unmounted, but we still need to show errored state in player controls
	 */
	useEffect(() => {
		addFilesToMonaco(
			[
				{
					path: `src/fake_entrypoint.ts`,
					value: script?.raw || `//Please add!`,
				},
			],
			true
		);
		//This is in timeout so that this async operation happens on next tick of loop.
		//Else monaco will not be initialized properly & can misbehave
		setTimeout(() => {
			(async () => {
				const errors = await getErrorsFromMonacoWorker();
				setErrors(errors);
				syncMonacoModels();

				if (errors.length) {
					emitAnalyticsEvent('story-script.errored', { source: 'daemon' });
				}
			})();
		}, 0);

		return () => {
			syncMonacoModels();
		};
	}, [script]);

	return <></>;
}
