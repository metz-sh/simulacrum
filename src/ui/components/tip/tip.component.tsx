import { Text, Tooltip, TooltipProps } from '@mantine/core';

export default function (
	props: Omit<TooltipProps, 'label'> & {
		text: string;
		children: React.ReactNode;
	}
) {
	return (
		<Tooltip
			radius={7}
			styles={{
				tooltip: {
					border: '1px solid #222',
				},
			}}
			color="rgb(20, 20,25)"
			label={
				<Text color="#aaa" style={{ whiteSpace: 'initial' }}>
					{props.text}
				</Text>
			}
			{...props}
		>
			{props.children}
		</Tooltip>
	);
}
