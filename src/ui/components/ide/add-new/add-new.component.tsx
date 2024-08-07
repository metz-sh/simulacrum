import { Box, FocusTrap, TextInput, createStyles } from '@mantine/core';

import { useCommands } from '../../../commands/use-command.hook';
import { useContext, useEffect, useRef, useState } from 'react';
import { useClickOutside } from '@mantine/hooks';
import { FileTreeViewContext } from '../file-manager/file-tree-view.context';
import { useHost } from '../../../state-managers/host/host.store';

const useStyles = createStyles((theme) => ({
	control: {
		cursor: 'pointer',
		marginTop: '4px',
		marginBottom: '4px',
		fontWeight: 500,
		display: 'block',
		width: '100%',
		padding: `${theme.spacing.xs} ${theme.spacing.xs}`,
		fontSize: theme.fontSizes.md,
		fontFamily: 'Fira Mono',

		backgroundColor: '#101016',
		color: theme.colorScheme === 'dark' ? theme.white : theme.black,

		borderRadius: '5px',
	},
}));

function parseAndValidatePath(path: string, parentFolderPath: string) {
	if (!path) {
		throw new Error('Please add file name');
	}
	const pathParts = path.split('/');
	const endPart = pathParts[pathParts.length - 1];

	if (endPart.includes('.')) {
		if (!endPart.endsWith('.ts')) {
			throw new Error('Only .ts files are allowed');
		}
		return {
			type: 'file' as const,
			path: `${parentFolderPath}/${path}`,
		};
	}

	return {
		type: 'folder' as const,
		path: `${parentFolderPath}/${path}`,
	};
}

function AddNewInput(props: {
	isMounted: boolean;
	parentFolderPath: string;
	onCreate: (params: { path: string; type: 'file' | 'folder' }) => void;
	onFocusLost: () => void;
}) {
	const inputRef = useRef<HTMLInputElement>(null);
	const useClickOutsideRef = useClickOutside(() => {
		props.onFocusLost();
	});

	const [error, setError] = useState<string | undefined>();
	const [value, setValue] = useState<string>('');
	const {
		fileManagement: { addFile, addFolder },
	} = useCommands();
	const emitAnalyticsEvent = useHost((state) => state.emitAnalyticsEvent);

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
					ref={inputRef}
					ff={'Fira Mono'}
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
							const result = parseAndValidatePath(value, props.parentFolderPath);
							if (result.type === 'folder') {
								addFolder(result.path);
							} else {
								addFile(result.path, '');
							}
							setError(undefined);
							props.onCreate(result);

							emitAnalyticsEvent(`${result.type}.created`);
						} catch (error: any) {
							setError(error.message);
						}
					}}
					placeholder={'Add new file or folder'}
				/>
			</FocusTrap>
		</div>
	);
}

export function AddNew(props: {
	path: string;
	onCreate: (params: { path: string; type: 'file' | 'folder' }) => void;
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
				<AddNewInput
					isMounted={scrolled}
					parentFolderPath={props.path}
					onCreate={props.onCreate}
					onFocusLost={props.onFocusLost}
				/>
			</Box>
		</div>
	);
}
