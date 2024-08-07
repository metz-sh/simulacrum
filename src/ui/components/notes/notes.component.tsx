import { RichTextEditor, Link } from '@mantine/tiptap';
import { BubbleMenu, Editor, useEditor } from '@tiptap/react';
import Highlight from '@tiptap/extension-highlight';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';

import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import * as lowlight from 'lowlight';

import tsLanguageSyntax from 'highlight.js/lib/languages/typescript';
import TextStyle from '@tiptap/extension-text-style';
import { useCallback } from 'react';
import { debounce } from 'lodash';

function TextControls() {
	return (
		<RichTextEditor.ControlsGroup>
			<RichTextEditor.Bold />
			<RichTextEditor.Italic />
			<RichTextEditor.Underline />
		</RichTextEditor.ControlsGroup>
	);
}

function HeadingsControl() {
	return (
		<RichTextEditor.ControlsGroup>
			<RichTextEditor.H1 />
			<RichTextEditor.H2 />
			<RichTextEditor.H3 />
			<RichTextEditor.H4 />
		</RichTextEditor.ControlsGroup>
	);
}

function ExtraFormattingControls() {
	return (
		<RichTextEditor.ControlsGroup>
			<RichTextEditor.Highlight />
			<ColorControls />
			<RichTextEditor.ClearFormatting />
		</RichTextEditor.ControlsGroup>
	);
}

function ExtraControls() {
	return (
		<RichTextEditor.ControlsGroup>
			<RichTextEditor.Code />
			<RichTextEditor.Blockquote />
			<RichTextEditor.Hr />
		</RichTextEditor.ControlsGroup>
	);
}

function ListControls() {
	return (
		<RichTextEditor.ControlsGroup>
			<RichTextEditor.BulletList />
			<RichTextEditor.OrderedList />
		</RichTextEditor.ControlsGroup>
	);
}

function LinkControls() {
	return (
		<RichTextEditor.ControlsGroup>
			<RichTextEditor.Link />
			<RichTextEditor.Unlink />
		</RichTextEditor.ControlsGroup>
	);
}

function AlignControls() {
	return (
		<RichTextEditor.ControlsGroup>
			<RichTextEditor.AlignLeft />
			<RichTextEditor.AlignCenter />
			<RichTextEditor.AlignJustify />
			<RichTextEditor.AlignRight />
		</RichTextEditor.ControlsGroup>
	);
}

function SelectMenu(props: { editor?: Editor | null }) {
	if (!props.editor) {
		return <></>;
	}
	return (
		<BubbleMenu editor={props.editor}>
			<RichTextEditor.ControlsGroup>
				<RichTextEditor.Bold />
				<RichTextEditor.Italic />
				<RichTextEditor.Underline />
				<RichTextEditor.Highlight />
				<ColorControls />
				<RichTextEditor.Link />
				<RichTextEditor.ClearFormatting />
			</RichTextEditor.ControlsGroup>
		</BubbleMenu>
	);
}

function ColorControls() {
	return (
		<RichTextEditor.ColorPicker
			colors={[
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
		/>
	);
}

export default function (props: { content: string; onUpdate: (content: string) => void }) {
	const debouncedUpdate = useCallback(debounce(props.onUpdate, 200), []);
	const editor = useEditor({
		extensions: [
			StarterKit,
			TextStyle,
			Color,
			Underline,
			Link.configure({
				openOnClick: true,
				linkOnPaste: true,
			}),
			Highlight,
			TextAlign.configure({ types: ['heading', 'paragraph'] }),
			CodeBlockLowlight.configure({
				lowlight: lowlight.createLowlight({
					ts: tsLanguageSyntax,
				}),
			}),
		],
		content: props.content,
		onUpdate({ editor }) {
			debouncedUpdate(editor.getHTML());
		},
	});

	return (
		<RichTextEditor
			editor={editor}
			styles={{
				root: {
					minHeight: '70vh',
				},
				content: {
					height: '100%',
					backgroundColor: '#07090B',
					padding: '0px 130px 0px 130px',
					pre: {
						backgroundColor: 'rgb(11,11,18) !important',
					},
					h1: {
						color: '#4c6ef5',
						fontFamily: 'Space Grotesk',
						fontSize: '95px',
					},
					h2: {
						color: '#4c6ef5',
						fontFamily: 'Space Grotesk',
						fontSize: '75px',
					},
					h3: {
						color: '#4c6ef5',
						fontFamily: 'Space Grotesk',
						fontSize: '60px',
					},
					h4: {
						color: '#4c6ef5',
						fontFamily: 'Space Grotesk',
						fontSize: '45px',
					},
					p: {
						fontSize: '20px',
						fontWeight: 400,
					},
				},
				toolbar: {
					backgroundColor: '#07090B',
					'& .mantine-RichTextEditor-control': {
						backgroundColor: 'rgb(20,20,28)',
					},
				},
			}}
		>
			<RichTextEditor.Toolbar sticky stickyOffset={'48px'}>
				<TextControls />
				<ExtraFormattingControls />
				<ExtraControls />
				<HeadingsControl />
				<ListControls />
				<LinkControls />
				<AlignControls />
			</RichTextEditor.Toolbar>
			<SelectMenu editor={editor} />
			<RichTextEditor.Content />
		</RichTextEditor>
	);
}
