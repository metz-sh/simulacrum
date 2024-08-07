import PrettyPaperComponent from '../pretty-paper/pretty-paper.component';
import { ColorPicker, ColorSwatch, Popover } from '@mantine/core';
import PopoverDropdownHolderComponent from '../popover-dropdown-holder/popover-dropdown-holder.component';
import { CgColorPicker } from 'react-icons/cg';
import { useState } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { useCommands } from '../../commands/use-command.hook';
import { ClassNodeProps, FolderNodeProps } from '../reactflow/models';

export default function (props: { storyId: string; node: ClassNodeProps | FolderNodeProps }) {
	const storedColor = props.node.data.styleCustomizations?.backgroundColor || '#232D41';
	const [color, setColor] = useState(storedColor);
	const [isOpened, { open, close, toggle }] = useDisclosure();

	const {
		node: { setNodeColor },
	} = useCommands();

	return (
		<PrettyPaperComponent>
			<Popover
				opened={isOpened}
				onOpen={open}
				onClose={close}
				closeOnEscape={true}
				closeOnClickOutside={true}
			>
				<Popover.Target>
					<ColorSwatch color={color} size={35} onClick={toggle}>
						<CgColorPicker />
					</ColorSwatch>
				</Popover.Target>
				<Popover.Dropdown
					style={{
						backgroundColor: 'rgb(6,6,12)',
					}}
				>
					<PopoverDropdownHolderComponent title="Set color" close={close}>
						<ColorPicker
							value={color}
							withPicker={false}
							size={'lg'}
							format="hex"
							swatches={[
								'#232D41',
								'#25262b',
								'#868e96',
								'#fa5252',
								'#e64980',
								'#be4bdb',
								'#7950f2',
								'#4c6ef5',
								'#228be6',
								'#15aabf',
								'#12b886',
								'#40c057',
								'#82c91e',
								'#fab005',
								'#fd7e14',
							]}
							onChange={(color) => {
								setColor(color);
								setNodeColor(props.storyId, props.node, color);
							}}
						/>
					</PopoverDropdownHolderComponent>
				</Popover.Dropdown>
			</Popover>
		</PrettyPaperComponent>
	);
}
