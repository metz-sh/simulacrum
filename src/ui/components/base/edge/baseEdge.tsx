import { EdgeLabelRenderer, EdgeProps, getSmoothStepPath, useStore } from 'reactflow';
import './baseEdge.css';
import EdgeHighlightComponent from '../../edge-highlight/edge-highlight.component';
import { EdgeData } from './edge-data.model';
import { getEdgeParams } from './utils/get-floating-edge-params';
import { useCallback } from 'react';

function EdgeLabel({ edgeId }: { edgeId: string }) {
	return (
		<div
			id={`${edgeId}_signal_packet`}
			style={{
				position: 'absolute',
				width: '12px',
				height: '12px',
				borderRadius: '100%',
				backgroundColor: 'white',
				top: '-6px',
				left: '-6px',
				opacity: 0,
			}}
		></div>
	);
}

export default function baseEdge({
	id,
	source,
	target,
	style = {},
	markerEnd,
	data: edgeData,
}: EdgeProps<EdgeData>) {
	const sourceNode = useStore(useCallback((store) => store.nodeInternals.get(source), [source]));
	const targetNode = useStore(useCallback((store) => store.nodeInternals.get(target), [target]));

	if (!sourceNode || !targetNode) {
		return null;
	}

	const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);
	const [edgePath] = getSmoothStepPath({
		// we need this little hack in order to display the gradient for a straight line
		sourceX: sx,
		sourceY: sy,
		sourcePosition: sourcePos,
		targetX: tx,
		targetY: ty,
		targetPosition: targetPos,
		offset: 30,
		// centerX,
		borderRadius: 100,
	});
	const [reverseEdgePath] = getSmoothStepPath({
		// we need this little hack in order to display the gradient for a straight line
		sourceX: tx,
		sourceY: ty,
		sourcePosition: targetPos,
		targetX: sx,
		targetY: sy,
		targetPosition: sourcePos,
		offset: 30,
		// centerX,
		borderRadius: 100,
	});

	return (
		<>
			<path
				id={id}
				style={style}
				className="react-flow__edge-path"
				d={edgePath}
				markerEnd={markerEnd}
			/>
			<path
				id={`${id}_reverse`}
				style={style}
				className="react-flow__edge-path"
				d={reverseEdgePath}
				markerStart={markerEnd}
				markerEnd={markerEnd}
			/>
			{/* <EdgeHighlightComponent
        id={id}
        data={edgeData}
        edgePath={edgePath}
        labelX={labelX}
        labelY={labelY}
        markerStart={markerEnd}
        markerEnd={markerEnd} 
      /> */}
			<EdgeLabelRenderer>
				<EdgeLabel edgeId={id} />
			</EdgeLabelRenderer>
		</>
	);
}
