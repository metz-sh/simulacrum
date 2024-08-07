import { Grid, createStyles } from '@mantine/core';
import { SourceCode } from '../../models/source-code';
import { Editor, useMonaco } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';
import { TbPlaystationSquare } from 'react-icons/tb';
import { CodeDaemonState } from '../../state-managers/code-daemon/code-daemon-types';
import BuildConsole from '../build-console/build-console';
import ts from 'typescript';
import ButtonComponent from '../button/button.component';
import { useHost } from '../../state-managers/host/host.store';
import { getErrorsFromMonacoInstance } from '../../commands/ide/get-errors-from-monaco-worker';
import { ScriptValidator } from './script-validator';
import { CompilerErrorCode } from '../../../compiler/compliler-error-codes';

const useStyles = createStyles((theme) => ({
	menuBar: {
		backgroundColor: '#07090B',
		display: 'flex',
		justifyContent: 'end',
		alignItems: 'center',
		padding: '10px',
		gap: '10px',
	},
}));

export default function (props: {
	sourceCode: SourceCode;
	onBuild: (transpiledCode: string, tsCode: string) => void;
	height?: string;
}) {
	const { classes } = useStyles();
	const monaco = useMonaco();
	const editor = useRef<any>(null);

	const emitAnalyticsEvent = useHost((state) => state.emitAnalyticsEvent);

	const [build, setBuild] = useState<CodeDaemonState['build']>({ state: 'uninitiated' });
	const [isLoading, setIsLoading] = useState(false);

	useEffect(() => {
		if (monaco) {
			const { path, value } = props.sourceCode;
			const uri = monaco.Uri.parse(path);
			const existingModel = monaco.editor.getModel(uri);
			if (existingModel) {
				existingModel.setValue(value);
				return;
			}
			monaco.editor.createModel(value, 'typescript', monaco.Uri.parse(path));
		}
	}, [monaco]);

	function handleEditorDidMount(editorRef: any) {
		editor.current = editorRef;
	}

	return (
		<div style={{ backgroundColor: '#07090B' }}>
			<Grid gutter={0} style={props.height ? { height: props.height } : {}}>
				<Grid.Col xs={12} className={classes.menuBar}>
					<BuildConsole
						build={build}
						style={{
							maxWidth: '500px',
						}}
						onErroredFileClick={() => {}}
					/>
					<ButtonComponent
						icon={<TbPlaystationSquare size={'18px'} />}
						loading={isLoading}
						onClick={async () => {
							if (!monaco) {
								throw new Error('monaco not ready!');
							}
							const errors = await getErrorsFromMonacoInstance(monaco);
							if (errors.length) {
								setBuild({
									state: 'errored',
									errors,
								});
								emitAnalyticsEvent('code-console-build.errored');
								return;
							}

							try {
								setIsLoading(true);
								const { path: scriptPath } = props.sourceCode;
								const uri = monaco!.Uri.parse(scriptPath);
								const scriptValue = monaco!.editor.getModel(uri)!.getValue();

								const sourceFile = ts.createSourceFile(
									'story-script.ts',
									scriptValue,
									ts.ScriptTarget.Latest,
									true
								);
								const validator = new ScriptValidator([sourceFile]);
								const errors = validator.validateBeforeParsing();
								if (errors) {
									setBuild({
										state: 'errored',
										errors: errors,
									});
									emitAnalyticsEvent('code-console-build.errored');
									return;
								}

								const compiledCode = ts.transpile(scriptValue);
								props.onBuild(compiledCode, scriptValue);
								setIsLoading(false);
							} catch (error: any) {
								setBuild({
									state: 'errored',
									errors: [
										{
											sourceable: false,
											code: CompilerErrorCode.UNKNOWN,
											message: error.message || 'Something went wrong!',
										},
									],
								});
								emitAnalyticsEvent('code-console-build.errored');
								console.error(error);
							} finally {
								setIsLoading(false);
							}
						}}
					>
						Submit
					</ButtonComponent>
				</Grid.Col>
				<Grid.Col xs={12}>
					<Editor
						theme="theme"
						height="100%"
						defaultLanguage="typescript"
						defaultValue={props.sourceCode.value}
						path={props.sourceCode.path}
						options={{
							fontSize: 18,
							fontWeight: '500',
							fontFamily: 'Fira Mono',
							minimap: {
								enabled: false,
							},
							overviewRulerLanes: 0,
							lineNumbersMinChars: 2,
						}}
						onMount={handleEditorDidMount}
					/>
				</Grid.Col>
			</Grid>
		</div>
	);
}
