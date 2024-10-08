import { Box, createStyles } from '@mantine/core';
import { useState } from 'react';
import { useCodeDaemon } from '../../../state-managers/code-daemon/code-daemon.store';
import { FileSystemNode } from '../../../common/file-system/file-sytem';
import { Folder } from '../folder/folder';
import { File } from '../file/file';
import { Settings } from '../../../../settings';
import { useScrollIntoView } from '@mantine/hooks';
import { FileTreeViewContext } from './file-tree-view.context';
import { useContextMenu } from 'mantine-contextmenu';
import { ContextMenuItemOptions } from 'mantine-contextmenu/dist/types';
import { FiFilePlus } from 'react-icons/fi';
import { DragDropContext, DropResult, Droppable, OnDragEndResponder } from 'react-beautiful-dnd';
import { AddNew } from '../add-new/add-new.component';
import { FileTreeDragContext } from './file-tree-drag.context';
import { useCommands } from '../../../commands/use-command.hook';
import { useHost } from '../../../state-managers/host/host.store';

const getFileTreeContextMenu = (params: { onAddNewClick: () => void }) => {
	return [
		{
			key: 'addNew',
			icon: <FiFilePlus size="15px" />,
			onClick: params.onAddNewClick,
		},
	] as ContextMenuItemOptions[];
};

const useStyles = createStyles((theme) => ({
	fileTreeParent: {
		minHeight: '50%',
		height: '50%',
		maxHeight: '50%',
		backgroundColor: '#07090B',
		padding: '10px',
	},

	fileTree: {
		height: '100%',
		borderRadius: '15px',
		padding: '20px',
		border: '1px #222 solid',
	},
}));

function sortFileSystem(f1: FileSystemNode, f2: FileSystemNode) {
	if (f1.isFolder && !f2.isFolder) {
		return -1;
	}
	if (!f1.isFolder && f2.isFolder) {
		return 1;
	}
	return f1.name < f2.name ? -1 : 1;
}

const parseFileSystemNode = (
	node: FileSystemNode,
	index: number,
	path: string = ''
): React.ReactElement<typeof File | typeof Folder> => {
	const currentPath = path + '/' + node.name;

	if (node.isFolder) {
		const children = Object.values(node.children)
			.sort(sortFileSystem)
			.map((childNode, index) => parseFileSystemNode(childNode, index, currentPath));

		return (
			<Folder index={index} key={node.name} name={node.name} path={node.fullPath}>
				{children}
			</Folder>
		);
	} else {
		return <File index={index} key={node.name} name={node.name} path={node.fullPath} />;
	}
};

function parsePathForMove(result: DropResult) {
	if (!result.destination) {
		return;
	}
	const oldPath = result.draggableId;
	const newPath = (() => {
		const pathParts = oldPath.split('/');
		const name = pathParts[pathParts.length - 1];
		return `${result.destination.droppableId}/${name}`;
	})();

	return {
		oldPath,
		newPath,
	};
}

export function FileTreeView() {
	const { classes } = useStyles();

	const [isBeingAddedTo, setIsBeingAddedTo] = useState(false);

	const { scrollIntoView, targetRef, scrollableRef } = useScrollIntoView<
		HTMLDivElement,
		HTMLDivElement
	>({
		duration: 100,
	});

	const { useProject } = useCodeDaemon((state) => ({ useProject: state.useProject }));
	const emitAnalyticsEvent = useHost((state) => state.emitAnalyticsEvent);

	const { fileSystemTree } = useProject((state) => ({
		fileSystemTree: state.fileSystemTree,
		version: state.version,
	}));

	const {
		fileManagement: { move },
	} = useCommands();

	const fileElements = parseFileSystemNode(fileSystemTree.root, 0);

	const showContextMenu = useContextMenu();

	const [draggingId, setDraggingId] = useState<string>();

	const fileTreeBox = (
		<Box
			className={classes.fileTreeParent}
			onContextMenu={showContextMenu(
				getFileTreeContextMenu({
					onAddNewClick() {
						setIsBeingAddedTo(true);
					},
				}),
				{
					borderRadius: '4px',
					styles: {
						root: {
							padding: '2px',
							backgroundColor: 'rgb(6,6,12)',
						},
						item: {
							borderRadius: '4px',
						},
					},
				}
			)}
		>
			<FileTreeViewContext.Provider
				value={{
					targetRef,
					scrollIntoView,
				}}
			>
				<Box
					ref={scrollableRef}
					sx={{ overflowY: 'auto', overflowX: 'auto', flex: 1 }}
					className={classes.fileTree}
				>
					{' '}
					{/* --- File Elements : Folder | File --- */}
					{fileElements}
					{isBeingAddedTo && (
						<AddNew
							path={Settings.rootPath}
							onFocusLost={() => {
								setIsBeingAddedTo(false);
							}}
							onCreate={() => {
								setIsBeingAddedTo(false);
							}}
						/>
					)}
				</Box>
			</FileTreeViewContext.Provider>
		</Box>
	);

	return (
		<DragDropContext
			onDragEnd={(result) => {
				setDraggingId(undefined);

				const movePaths = parsePathForMove(result);
				if (!movePaths) {
					return;
				}
				move(movePaths.oldPath, movePaths.newPath);

				const entityType = movePaths.oldPath.includes('.') ? 'file' : 'folder';
				emitAnalyticsEvent(`${entityType}.moved`);
			}}
			onDragStart={(start) => {
				setDraggingId(start.draggableId);
			}}
		>
			<FileTreeDragContext.Provider value={[{ draggingId }]}>
				{fileTreeBox}
			</FileTreeDragContext.Provider>
		</DragDropContext>
	);
}
