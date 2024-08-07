import { MantineSize, Paper, Text, createStyles } from '@mantine/core';
import { MdArrowOutward } from 'react-icons/md';

function DocInIframe(props: { src: string }) {
	return (
		<Paper h={'80vh'}>
			<iframe height={'100%'} width={'100%'} src={props.src} style={{ border: 'none' }} />
		</Paper>
	);
}

const useStyles = createStyles((theme) => ({
	docLink: {
		textDecoration: 'underline',
		cursor: 'pointer',
		color: '#3966cc',
		'&:hover': {
			color: '#3f66ff',
		},
		textUnderlineOffset: '3px',
	},
}));

export default function (props: {
	title: string;
	link: string;
	size?: MantineSize;
	text?: string;
}) {
	const { classes } = useStyles();
	const isDocs = props.link.startsWith('https://docs.metz.sh');
	return (
		<Text
			span
			className={classes.docLink}
			onClick={() => {
				window.open(props.link, '_blank');
			}}
			size={props.size}
		>
			{`${props.text || (isDocs ? 'Check docs' : 'Go to link')}`} <MdArrowOutward />
		</Text>
	);
}
