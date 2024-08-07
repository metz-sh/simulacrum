import ButtonComponent from '../button/button.component';
import { TbNotebook } from 'react-icons/tb';
import NotesComponent from '../notes/notes.component';
import { useCodeDaemon } from '../../state-managers/code-daemon/code-daemon.store';
import { shallow } from 'zustand/shallow';
import { openModal } from '../open-modal/open-modal';

function NotesHolder(props: Parameters<typeof NotesComponent>[0]) {
	return <NotesComponent {...props} />;
}

export default function () {
	const useNotes = useCodeDaemon((_) => _.useNotes);
	const { updateContent, content } = useNotes(
		(selector) => ({
			updateContent: selector.updateContent,
			content: selector.content,
		}),
		shallow
	);
	return (
		<ButtonComponent
			icon={<TbNotebook />}
			onClick={() => {
				openModal({
					title: 'Research Notes',
					size: '90vw',
					children: <NotesHolder content={content} onUpdate={updateContent} />,
				});
			}}
		>
			Open Notes
		</ButtonComponent>
	);
}
