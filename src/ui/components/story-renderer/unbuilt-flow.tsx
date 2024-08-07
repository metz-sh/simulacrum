import ReactFlow, { Background, BackgroundVariant, Controls, Panel } from 'reactflow';
import { gridGap } from '../../common/sizes';
import BuildButton from '../ide/build-button';
import { Text } from '@mantine/core';

export default function UnBuiltFlow(props: { height?: string }) {
	return (
		<div className="flow" style={{ height: props.height }}>
			<ReactFlow
				proOptions={{ hideAttribution: true }}
				fitView={true}
				zoomOnScroll={false}
				panOnScroll={false}
				preventScrolling={false}
				minZoom={0}
			>
				<Background
					id={'default'}
					variant={BackgroundVariant.Dots}
					gap={gridGap}
					offset={1}
					color="#222"
				/>
				<Panel position="bottom-center">
					<div
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							gap: '20px',
							backgroundColor: 'black',
							border: '2px solid #ddd',
							borderRadius: '10px',
							padding: '10px',
							fontWeight: 800,
							// fontFamily: 'basier_circleregular',
						}}
					>
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								justifyContent: 'center',
							}}
						>
							<Text fw={100} opacity={0.5}>
								Build the project to see changes here
							</Text>
						</div>
						<BuildButton />
					</div>
				</Panel>
				<Controls />
			</ReactFlow>
		</div>
	);
}
