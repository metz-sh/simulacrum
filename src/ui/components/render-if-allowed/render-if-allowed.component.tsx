import { useHost } from '../../state-managers/host/host.store';

export default function (props: { children: React.ReactNode }) {
	const editMode = useHost((state) => state.isEditMode);
	if (!editMode) {
		return <></>;
	}

	return <>{props.children}</>;
}
