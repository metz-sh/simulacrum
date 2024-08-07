import { memo, useEffect, useState } from 'react';
import './method-node.css';
import { Handle, NodeProps, Position } from 'reactflow';
import { Box, Popover, createStyles } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useHost } from '../../../state-managers/host/host.store';
import NodeCardComponent from '../../node-information-pane/node-card.component';
import PopoverDropdownHolderComponent from '../../popover-dropdown-holder/popover-dropdown-holder.component';
import NodeDebugConsole from '../../node-debug-console/node-debug-console';
import { MethodNodeProps } from '../models';

const useStyles = createStyles((theme) => ({
	dropdown: {
		backgroundColor: 'var(--bg-color)',
	},
	logPopup: {
		backgroundColor: 'rgb(6,6,12)',
	},
}));

export default memo((props: MethodNodeProps) => {
	const emitAnalyticsEvent = useHost((state) => state.emitAnalyticsEvent);

	const { classes } = useStyles();
	const [isOpened, { open, close, toggle }] = useDisclosure();

	useEffect(() => {
		if (isOpened) {
			emitAnalyticsEvent('debugger.opened');
		}
	}, [isOpened]);

	return (
		<>
			<Popover
				transitionProps={{ transition: 'pop' }}
				position="top"
				classNames={classes}
				trapFocus
				opened={isOpened}
				onOpen={open}
				onClose={close}
			>
				<Popover.Target>
					<NodeCardComponent node={props} onClick={toggle} />
				</Popover.Target>

				<Popover.Dropdown>
					<PopoverDropdownHolderComponent title="Debugger" close={close}>
						<NodeDebugConsole node={props} />
					</PopoverDropdownHolderComponent>
				</Popover.Dropdown>
			</Popover>

			<>
				<Handle type="source" id="left" key="left" position={Position.Left} />
				<Handle type="source" id="right" key="right" position={Position.Right} />
				<Handle type="source" id="left" key="top" position={Position.Top} />
				<Handle type="source" id="bottom" key="bottom" position={Position.Bottom} />
			</>
		</>
	);
});
