import { EdgeProps, getBezierPath, getSmoothStepPath, useStore } from 'reactflow';
import './preview-edge.css';
import { EdgeData } from '../../base/edge/edge-data.model';
import { useCallback } from 'react';
import { getEdgeParams } from '../../base/edge/utils/get-floating-edge-params';

export default function previewEdge({
	id,
	source,
	target,
	markerStart,
	markerEnd,
	style = {},
}: EdgeProps) {
	const sourceNode = useStore(useCallback((store) => store.nodeInternals.get(source), [source]));
	const targetNode = useStore(useCallback((store) => store.nodeInternals.get(target), [target]));

	if (!sourceNode || !targetNode) {
		return null;
	}

	const { sx, sy, tx, ty, sourcePos, targetPos } = getEdgeParams(sourceNode, targetNode);

	const [edgePath] = getSmoothStepPath({
		sourceX: sx,
		sourceY: sy,
		sourcePosition: sourcePos,
		targetX: tx,
		targetY: ty,
		targetPosition: targetPos,
		offset: 30,
		borderRadius: 200,
	});

	return (
		<>
			<path
				id={id}
				style={style}
				className="react-flow__edge-path preview_edge"
				d={edgePath}
				markerStart={markerStart}
				markerEnd={markerEnd}
			/>
		</>
	);
}
