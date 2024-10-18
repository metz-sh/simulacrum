import { CSSProperties, useContext, useEffect, useState } from 'react';
import { createStyles, NavLink, Text, MantineTheme, HoverCard } from '@mantine/core';
import { FiFilePlus, FiFolder } from 'react-icons/fi';
import { ContextMenuItemOptions } from 'mantine-contextmenu/dist/types';
import { IconTrash } from '@tabler/icons-react';
import { useContextMenu } from 'mantine-contextmenu';
import { AddNew } from '../add-new/add-new.component';
import { useCommands } from '../../../commands/use-command.hook';
import { Rename } from '../rename/rename.component';
import { ContextMenuOptions } from '../../../common/context-menu/context-menu.options';
import { CgRename } from 'react-icons/cg';
import { Draggable, Droppable } from 'react-beautiful-dnd';
import { RxDragHandleDots2 } from 'react-icons/rx';
import { FileTreeDragContext } from '../file-manager/file-tree-drag.context';
import { motion } from 'framer-motion';
import { Settings } from '../../../../settings';
import { FolderActiveContext } from './folder-active.context';
import { useHost } from '../../../state-managers/host/host.store';
import { openConfirmModal } from '../../open-modal/open-confirm-modal';

// may be look into this
const getFolderContextMenu = (
	path: string,
	params: {
		onAddNewClick: () => void;
		onDeleteClick: () => void;
		onRenameClick: () => void;
	}
) => {
	if (path === Settings.rootPath) {
		return [
			{
				key: 'addNew',
				icon: <FiFilePlus size="15px" />,
				onClick: params.onAddNewClick,
			},
		] as ContextMenuItemOptions[];
	}

	return [
		{
			key: 'addNew',
			icon: <FiFilePlus size="15px" />,
			onClick: params.onAddNewClick,
		},
		{
			key: 'rename',
			icon: <CgRename size="15px" />,
			onClick: params.onRenameClick,
		},
		{
			key: 'delete',
			icon: <IconTrash size="15px" />,
			onClick: params.onDeleteClick,
		},
	] as ContextMenuItemOptions[];
};

const useStyles = createStyles((theme) => ({
	root: {
		padding: `${theme.spacing.xs} ${theme.spacing.xs}`,
		color: theme.colorScheme === 'dark' ? theme.colors.dark[0] : theme.black,

		'&:hover': {
			backgroundColor: '#000',
			boxShadow: 'inset #5b6fd6 0px 0px 30px -12px',
			color: theme.colorScheme === 'dark' ? theme.white : theme.black,
		},

		borderRadius: '5px',
	},
}));

function HoverDragInfo(props: { children: JSX.Element }) {
	return (
		<HoverCard width={280} shadow="md">
			<HoverCard.Target>{props.children}</HoverCard.Target>
			<HoverCard.Dropdown>
				<Text size="sm">Drag to move folder</Text>
			</HoverCard.Dropdown>
		</HoverCard>
	);
}

function getControlBackgroundStyle(
	params: {
		isActive?: boolean;
		isContextMenuOpen?: boolean;
		isDraggingOver?: boolean;
	},
	theme: MantineTheme
): CSSProperties {
	if (params.isDraggingOver) {
		return {
			border: '1px dashed #666',
			boxShadow: 'inset #5b6fd6 0px 0px 60px -12px',
		};
	}

	if (params.isContextMenuOpen) {
		return {
			backgroundColor: '#000',
			boxShadow: 'inset #5b6fd6 0px 0px 30px -12px',
			color: theme.colorScheme === 'dark' ? theme.white : theme.black,
		};
	}

	return {};
}

function getIfDropDisabled(params: { draggingId?: string; folderPath: string }) {
	if (!params.draggingId) {
		return false;
	}

	if (params.draggingId === params.folderPath) {
		return true;
	}

	const isFile = (() => {
		const pathParts = params.draggingId.split('/');
		const lastPart = pathParts[pathParts.length - 1];
		return lastPart.includes('.');
	})();

	const source = isFile
		? params.draggingId.substring(0, params.draggingId.lastIndexOf('/'))
		: params.draggingId;

	if (isFile) {
		return source === params.folderPath;
	}
	return (
		params.folderPath.startsWith(source + '/') ||
		source.substring(0, source.lastIndexOf('/')) === params.folderPath
	);
}

export function Folder(props: {
	index: number;
	name: string;
	path: string;
	children?: JSX.Element[];
}) {
	const { classes, theme } = useStyles();

	const [isActive, setIsActive] = useState(false);
	const [opened, setOpened] = useState(false); // make it independent of isActive state

	const [isBeingAddedTo, setIsBeingAddedTo] = useState(false);
	const [isBeingRenamed, setIsBeingRenamed] = useState(false);
	const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

	const emitAnalyticsEvent = useHost((state) => state.emitAnalyticsEvent);

	const showContextMenu = useContextMenu();

	const folderContext = useContext(FolderActiveContext);

	useEffect(() => {
		if (!showContextMenu.isContextMenuVisible) {
			setIsContextMenuOpen(false);
		}
	}, [showContextMenu.isContextMenuVisible]);

	const {
		fileManagement: { deleteFolder },
	} = useCommands();

	useEffect(() => {
		if (!isActive) {
			setOpened(false);
			return;
		}
		setOpened(true);
		folderContext?.setIsActive(true);
	}, [isActive]);

	useEffect(() => {
		if (isBeingAddedTo) setOpened(true);
	}, [isBeingAddedTo]);

	useEffect(() => {
		console.log('IsActive : ', isActive);
		console.log('Opened : ', opened);
		console.log('isBeingAddedTo : ', isBeingAddedTo);
	}, [isActive, opened, isBeingAddedTo]);

	const getDraggable = () => {
		if (props.path === Settings.rootPath) {
			return <></>;
		}
		return (
			<Draggable draggableId={props.path} index={props.index}>
				{(provided, snapshot) => {
					return (
						<div
							{...provided.dragHandleProps}
							{...provided.draggableProps}
							ref={provided.innerRef}
						>
							<motion.div
								style={{
									display: 'flex',
									justifyContent: 'center',
									alignItems: 'center',
								}}
								initial={{
									borderRadius: '5px',
									color: '#999',
								}}
								whileHover={{
									scale: 1.2,
									color: '#fff',
								}}
								whileTap={{
									scale: 1.6,
									color: '#fff',
								}}
								transition={{
									duration: 0.08,
								}}
							>
								<RxDragHandleDots2 color="inherit" size={'20px'} />
							</motion.div>
						</div>
					);
				}}
			</Draggable>
		);
	};

	const folderNameBox = (
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
			{getDraggable()}
		</div>
	);

	const renameFolderBox = (
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
				if (path.includes('.')) {
					throw new Error('Can not convert into file');
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

	function getAddNewComponent() {
		console.log('Add new comp called');
		return (
			<AddNew
				path={props.path}
				onFocusLost={() => {
					setIsBeingAddedTo(false);
				}}
				onCreate={() => {
					setIsBeingAddedTo(false);
				}}
			/>
		);
	}

	const [{ draggingId }] = useContext(FileTreeDragContext);
	const isDropDisabled = getIfDropDisabled({
		draggingId,
		folderPath: props.path,
	});

	return (
		<div
			onContextMenu={(args) => {
				setIsContextMenuOpen(true);
				showContextMenu(
					getFolderContextMenu(props.path, {
						onAddNewClick() {
							console.log('Add new click');
							setIsBeingAddedTo(true);
							// setOpened(false);
						},
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
									deleteFolder(props.path);
									emitAnalyticsEvent('folder.deleted');
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
			<Droppable droppableId={props.path} isDropDisabled={isDropDisabled}>
				{(provided, snapshot) => (
					<div>
						<NavLink
							{...provided.droppableProps}
							ref={provided.innerRef}
							style={getControlBackgroundStyle(
								{
									isContextMenuOpen: isContextMenuOpen,
									isDraggingOver: snapshot.isDraggingOver,
								},
								theme
							)}
							label={isBeingRenamed ? renameFolderBox : folderNameBox}
							childrenOffset={28}
							classNames={classes}
							onClick={() => setOpened((o) => !o)}
							opened={opened}
							icon={<FiFolder />}
						>
							{isBeingAddedTo && getAddNewComponent()}
							<FolderActiveContext.Provider value={{ setIsActive }}>
								{props.children}
							</FolderActiveContext.Provider>
						</NavLink>
						{provided.placeholder}
					</div>
				)}
			</Droppable>
		</div>
	);
}
