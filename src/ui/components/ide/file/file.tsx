import { Box, MantineTheme, createStyles } from '@mantine/core';

import { TbBrandTypescript as IconTypescript } from 'react-icons/tb';
import { useCodeDaemon } from '../../../state-managers/code-daemon/code-daemon.store';
import { IconTrash } from '@tabler/icons-react';
import { FileModifiers } from '../../../ui-types';
import { Text } from '@mantine/core';
import { useCommands } from '../../../commands/use-command.hook';
import { ContextMenuItemOptions } from 'mantine-contextmenu/dist/types';
import { useContextMenu } from 'mantine-contextmenu';
import { CSSProperties, useContext, useEffect, useState } from 'react';
import { Rename } from '../rename/rename.component';
import { ContextMenuOptions } from '../../../common/context-menu/context-menu.options';
import { CgRename } from 'react-icons/cg';
import { Draggable } from 'react-beautiful-dnd';
import { FolderActiveContext } from '../folder/folder-active.context';
import { useHost } from '../../../state-managers/host/host.store';
import { openConfirmModal } from '../../open-modal/open-confirm-modal';

const getFileContextMenu: (params: {
	onDeleteClick: () => void;
	onRenameClick: () => void;
}) => ContextMenuItemOptions[] = (params) => {
	return [
		{
			key: 'delete',
			icon: <IconTrash size="15px" />,
			onClick: params.onDeleteClick,
		},
		{
			key: 'rename',
			icon: <CgRename size="15px" />,
			onClick: params.onRenameClick,
		},
	];
};

const useStyles = createStyles((theme) => ({
	control: {
		cursor: 'pointer',
		marginTop: '4px',
		marginBottom: '4px',
		fontWeight: 500,
		display: 'block',
		width: '100%',
		padding: `${theme.spacing.xs} ${theme.spacing.xs}`,
		color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,
		fontSize: theme.fontSizes.md,
		fontFamily: 'Fira Mono',

		'&:hover': {
			boxShadow: 'inset #223fd3 0px 0px 30px -12px',
			color: theme.colorScheme === 'dark' ? theme.white : theme.black,
		},

		borderRadius: '5px',
	},
}));

function getControlBackgroundStyle(
	params: {
		isDragging?: boolean;
		isActive?: boolean;
		isContextMenuOpen?: boolean;
	},
	theme: MantineTheme
): CSSProperties {
	if (params.isDragging) {
		return {
			boxShadow: 'inset #223fd3 0px 0px 60px -12px',
			color: theme.colorScheme === 'dark' ? theme.white : theme.black,
		};
	}

	if (params.isActive) {
		return {
			// backgroundColor: theme.colorScheme === 'dark' ? theme.colors.dark[5] : theme.colors.gray[0],
			color: theme.colorScheme === 'dark' ? theme.white : theme.black,
			boxShadow: 'inset #223fd3 0px 0px 60px -20px',
		};
	}

	if (params.isContextMenuOpen) {
		return {
			boxShadow: 'inset #223fd3 0px 0px 30px -12px',
			color: theme.colorScheme === 'dark' ? theme.white : theme.black,
		};
	}

	return {};
}

function _File(props: {
	index: number;
	name: string;
	path: string;
	isDragging?: boolean;
	modifiers?: FileModifiers;
}) {
	const { classes, theme } = useStyles();
	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
	const [isBeingRenamed, setIsBeingRenamed] = useState(false);
	const [isActive, setIsActive] = useState(false);

	const { useIDE } = useCodeDaemon((state) => ({ useIDE: state.useIDE }));
	const { setActiveFilePath, activeFilePath } = useIDE((state) => ({
		setActiveFilePath: state.setActiveFilePath,
		activeFilePath: state.activeFilePath,
	}));

	const folderContext = useContext(FolderActiveContext);

	const {
		fileManagement: { deleteFile },
	} = useCommands();

	const emitAnalyticsEvent = useHost((state) => state.emitAnalyticsEvent);

	const showContextMenu = useContextMenu();

	const renameFileBox = (
		<Rename
			name={props.name}
			path={props.path}
			validator={(path) => {
				if (!path) {
					throw new Error('No name provided!');
				}
				if (path.includes('/')) {
					throw new Error('Not allowed to create sub path while renaming');
				}
				if (!path.endsWith('.ts')) {
					throw new Error('Only .ts files are allowed');
				}
			}}
			onRenamed={() => {
				setIsBeingRenamed(false);
			}}
			onFocusLost={() => {
				setIsBeingRenamed(false);
			}}
		/>
	);

	const fileNameBox = (
		<div
			style={{
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
			}}
		>
			<Text fw={500} ff={'Fira Mono'} fz={'md'}>
				{props.name}
			</Text>
		</div>
	);

	useEffect(() => {
		if (!showContextMenu.isContextMenuVisible) {
			setIsContextMenuOpen(false);
		}
	}, [showContextMenu.isContextMenuVisible]);

	useEffect(() => {
		setIsActive(activeFilePath === props.path);
	}, [activeFilePath]);

	useEffect(() => {
		if (!isActive) {
			return;
		}
		folderContext?.setIsActive(true);
	}, [isActive]);

	return (
		<div
			className={classes.control}
			style={getControlBackgroundStyle(
				{
					isActive: isActive,
					isContextMenuOpen: isContextMenuOpen,
					isDragging: props.isDragging,
				},
				theme
			)}
			onClick={(e) => {
				if (e.detail === 2) {
					setIsBeingRenamed(true);
					emitAnalyticsEvent('file.double_clicked');
					return;
				}
				setActiveFilePath(props.path);
			}}
			onContextMenu={(args) => {
				setIsContextMenuOpen(true);
				return showContextMenu(
					getFileContextMenu({
						onDeleteClick() {
							openConfirmModal({
								title: 'Are you sure you want to delete?',
								children: (
									<Text
										fz={'xl'}
										variant={'gradient'}
										gradient={{ from: '#75C2DE', to: '#5954CB', deg: 45 }}
										ff={'Fira Mono'}
									>
										{props.name}
									</Text>
								),
								onConfirm() {
									deleteFile(props.path);
									emitAnalyticsEvent('file.deleted');
								},
							});
						},
						onRenameClick() {
							setIsBeingRenamed(true);
						},
					}),
					ContextMenuOptions
				)(args);
			}}
		>
			<Box sx={{ display: 'flex', alignItems: 'center' }}>
				<IconTypescript color="#3178C6" />
				<Box ml="xs" sx={{ flexGrow: 1 }}>
					{isBeingRenamed ? renameFileBox : fileNameBox}
				</Box>
			</Box>
		</div>
	);
}

export function File(props: Parameters<typeof _File>[0]) {
	return (
		<Draggable draggableId={props.path} index={props.index}>
			{(provided, snap) => {
				return (
					<div
						{...provided.dragHandleProps}
						{...provided.draggableProps}
						ref={provided.innerRef}
					>
						<_File {...props} isDragging={snap.isDragging} />
					</div>
				);
			}}
		</Draggable>
	);
}
