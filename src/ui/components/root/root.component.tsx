import '../../styles/font.css';
import { ModalsProvider } from '@mantine/modals';
import { BaseProps } from '../../ui-types';
import { MantineProvider, MantineThemeOverride } from '@mantine/core';
import { ContextMenuProvider } from 'mantine-contextmenu';

function Definitions() {
	return (
		<svg style={{ height: '0', width: '0', position: 'absolute' }}>
			<defs>
				<marker
					id="edge-circle"
					viewBox="-5 -5 10 10"
					refX="0"
					refY="0"
					markerUnits="strokeWidth"
					markerWidth="10"
					markerHeight="10"
					orient="auto"
				>
					<circle stroke="#2a8af6" strokeOpacity="0.75" r="2" cx="0" cy="0" />
				</marker>
			</defs>
		</svg>
	);
}

const defautTheme: MantineThemeOverride = {
	colorScheme: 'dark',
	fontFamily: 'strawfordregular',
};

export default function Root(props: BaseProps & { children: React.ReactNode }) {
	const { enableModalProvider } = props;
	const Container = (props: { children: React.ReactNode }) =>
		enableModalProvider ? (
			<ModalsProvider>{props.children}</ModalsProvider>
		) : (
			<>{props.children}</>
		);
	return (
		<MantineProvider
			withGlobalStyles
			withNormalizeCSS
			theme={{
				...defautTheme,
				...props.theme,
			}}
		>
			<ContextMenuProvider>
				<Container>
					<Definitions />
					{props.children}
				</Container>
			</ContextMenuProvider>
		</MantineProvider>
	);
}
