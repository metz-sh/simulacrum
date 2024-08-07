import { Box, FocusTrap, TextInput, createStyles } from '@mantine/core';

import { useCommands } from '../../../commands/use-command.hook';
import { useContext, useEffect, useRef, useState } from 'react';
import { useClickOutside } from '@mantine/hooks';
import { FileTreeViewContext } from '../file-manager/file-tree-view.context';
import { useHost } from '../../../state-managers/host/host.store';

const useStyles = createStyles((theme) => ({
	control: {
		cursor: 'pointer',
		fontWeight: 500,
		display: 'block',
		width: '100%',
		fontSize: theme.fontSizes.md,
		fontFamily: 'Fira Mono',

		backgroundColor: '#101016',
		color: theme.colorScheme === 'dark' ? theme.white : theme.black,

		borderRadius: '5px',
	},
}));

function RenameInput(props: {
	name: string;
	isMounted: boolean;
	path: string;
	validator: (path: string) => void;
	onRenamed: (params: { oldPath: string; newPath: string; name: string }) => void;
	onFocusLost: () => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const useClickOutsideRef = useClickOutside(() => {
		props.onFocusLost();
	});

	const emitAnalyticsEvent = useHost((state) => state.emitAnalyticsEvent);

	const [error, setError] = useState<string | undefined>();
	const [value, setValue] = useState<string>(props.name);
	const {
		fileManagement: { rename },
	} = useCommands();

	useEffect(() => {
		if (props.isMounted) {
			inputRef.current?.focus();
		}
	}, [props.isMounted]);

	return (
		<div
			ref={useClickOutsideRef}
			style={{
				width: '100%',
				height: '100%',
			}}
		>
			<FocusTrap active>
				<TextInput
					ml={'xs'}
					variant="unstyled"
					styles={{
						input: {
							fontFamily: 'Fira Mono',
						},
					}}
					ref={inputRef}
					value={value}
					onChange={(event) => setValue(event.currentTarget.value)}
					error={error}
					onKeyDown={(event) => {
						if (event.code === 'Escape') {
							props.onFocusLost();
							return;
						}
						if (event.code !== 'Enter') {
							return;
						}
						try {
							props.validator(value);
							const renamedPath = rename(props.path, value);
							setError(undefined);

							props.onRenamed({
								oldPath: props.path,
								newPath: renamedPath,
								name: value,
							});

							const entityType = props.path.includes('.') ? 'file' : 'folder';
							emitAnalyticsEvent(`${entityType}.renamed`);
						} catch (error: any) {
							setError(error.message);
						}
					}}
				/>
			</FocusTrap>
		</div>
	);
}

export function Rename(props: {
	path: string;
	name: string;
	validator: (path: string) => void;
	onRenamed: (params: { oldPath: string; newPath: string; name: string }) => void;
	onFocusLost: () => void;
}) {
	const { classes } = useStyles();

	const [scrolled, setScrolled] = useState(false);

	const { targetRef, scrollIntoView } = useContext(FileTreeViewContext);

	useEffect(() => {
		setTimeout(() => {
			scrollIntoView({
				alignment: 'center',
			});
			setScrolled(true);
		}, 100);
	}, []);

	return (
		<div className={classes.control} ref={targetRef}>
			<Box sx={{ display: 'flex', alignItems: 'center' }}>
				<RenameInput
					name={props.name}
					isMounted={scrolled}
					path={props.path}
					validator={props.validator}
					onRenamed={props.onRenamed}
					onFocusLost={props.onFocusLost}
				/>
			</Box>
		</div>
	);
}
