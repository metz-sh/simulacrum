import { ClassNodeData, FolderNodeData, MethodNodeData, NodeData } from './reactflow/models';

export default function (props: { conditional: () => React.ReactNode | undefined }) {
	const conditionalRender = props.conditional();
	if (conditionalRender) {
		return <>{conditionalRender}</>;
	}

	return <></>;
}
