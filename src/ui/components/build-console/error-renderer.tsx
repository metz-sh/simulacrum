import { Box, Flex, Highlight, Text, createStyles } from '@mantine/core';
import DocModalComponent from '../doc-modal/doc-modal.component';
import { CompilerError, CompilerErrors } from '../../../compiler/compiler-types';
import {
	CompilerErrorCodeAdditionalMessages,
	CompilerErrorCodeDocLinks,
} from '../../../compiler/compliler-error-codes';

const useStyles = createStyles((theme) => ({
	box: {
		marginBottom: '25px',
		fontFamily: 'Fira Mono',
		fontSize: '14px',
		fontWeight: 'normal',
	},
	container: {
		display: 'flex',
		justifyContent: 'flex-start',
		gap: '5px',
		flexDirection: 'column',
	},
	errorLocationContainer: {
		marginLeft: '15px',
	},
	errorLocation: {
		textDecoration: 'underline',
		cursor: 'pointer',
		color: 'teal',
		'&:hover': {
			color: 'cyan',
		},
	},
}));

function SourceableErrorsRenderer(props: {
	error: CompilerError & { sourceable: true };
	onFileClick: (params: { activeFilePath: string; line: number; character: number }) => void;
}) {
	const { classes } = useStyles();
	const { error, onFileClick } = props;
	return (
		<Box className={classes.box}>
			<div className={classes.container}>
				<div>
					<Text ff={'inherit'} color="#ff4646" span>
						error:
					</Text>
					<Text
						ff={'inherit'}
						span
						ml={'xs'}
						style={{
							whiteSpace: 'pre-wrap',
						}}
					>
						<Highlight
							highlight={error.highlights || []}
							highlightStyles={{ backgroundColor: 'inherit', color: '#52a4fc' }}
							ff={'inherit'}
							span
						>
							{`${error.message}\n\n${error.code ? CompilerErrorCodeAdditionalMessages[error.code].join('\n\n') : ''}`}
						</Highlight>
					</Text>
				</div>
				<div className={classes.errorLocationContainer}>
					-{' '}
					<span
						className={classes.errorLocation}
						onClick={() => {
							onFileClick({
								activeFilePath: error.fileName,
								line: error.position.startLine,
								character: error.position.startCharacter,
							});
						}}
					>
						{error.fileName}:{error.position.startLine}:{error.position.startCharacter}
					</span>
				</div>
				{error.code && (
					<Flex mt={'8px'}>
						<DocModalComponent
							title="How to fix?"
							link={CompilerErrorCodeDocLinks[error.code]}
						/>
					</Flex>
				)}
			</div>
		</Box>
	);
}

function CompilerExceptionRenderer(props: { error: CompilerError & { sourceable: false } }) {
	const { classes } = useStyles();
	const { error } = props;
	return (
		<Box className={classes.box}>
			<div className={classes.container}>
				<div>
					<Text ff={'inherit'} color="#ff4646" span>
						error:
					</Text>
					<Text
						ff={'inherit'}
						span
						ml={'xs'}
						style={{
							whiteSpace: 'pre-wrap',
						}}
					>
						<Highlight
							highlight={error.highlights || []}
							highlightStyles={{ backgroundColor: 'inherit', color: '#52a4fc' }}
							ff={'inherit'}
							span
						>
							{`${error.message}\n\n${CompilerErrorCodeAdditionalMessages[error.code].join('\n\n')}`}
						</Highlight>
					</Text>
				</div>
				<Flex mt={'4px'}>
					<DocModalComponent
						title="How to fix?"
						link={CompilerErrorCodeDocLinks[error.code]}
					/>
				</Flex>
			</div>
		</Box>
	);
}

export default function ErrorsRenderer(props: {
	errors: CompilerErrors;
	onFileClick: (params: { activeFilePath: string; line: number; character: number }) => void;
}) {
	const { classes } = useStyles();
	return (
		<div>
			{props.errors.map((error, index) => {
				return error.sourceable ? (
					<SourceableErrorsRenderer
						error={error}
						key={index}
						onFileClick={props.onFileClick}
					/>
				) : (
					<CompilerExceptionRenderer error={error} key={index} />
				);
			})}
		</div>
	);
}
