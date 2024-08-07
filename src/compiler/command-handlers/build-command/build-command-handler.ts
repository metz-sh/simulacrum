import * as ts from 'typescript';
import { CompilerResponseCode } from '../../compiler-types';
import { CommandHandlerIterface } from '../command-handler.interface';
import { BuildValidator } from './build-validator';
import compilerOptions from '../../compiler-options';
import { KeywordParser } from '../utils/keyword-parser/keyword-parser';
import { CallHierarchyParser } from './call-hierarchy-parser';
import { removeDecorators } from './transformers/remove-decorators';
import { transformCallExpressions } from './transformers/transform-call-expressions/transform-call-expressions';
import addStubsFromHeritage from './transformers/add-stubs-from-heritage';

export class BuildCommandHandler extends CommandHandlerIterface {
	private sourceDirectory = compilerOptions.rootDir!;
	private sourceFiles: ts.SourceFile[];

	constructor(
		public program: ts.Program,
		public readonly host: {
			compilerHost: ts.CompilerHost;
			updateFile: (sourceFile: ts.SourceFile) => boolean;
		},
		public readonly fsMap: Map<string, string>,
		public readonly outputMap: Map<string, string>,

		private readonly projectName: string,
		public tag: string | number
	) {
		super(program, host, fsMap, outputMap, tag);

		this.sourceFiles = this.program
			.getSourceFiles()
			.filter((sf) => sf.fileName.startsWith(this.sourceDirectory));
	}

	async execute() {
		const programTypeChecker = this.program.getTypeChecker();

		const validator = new BuildValidator(this.sourceFiles, programTypeChecker);
		const errors = validator.validateBeforeParsing();

		if (errors) {
			return {
				responseCode: CompilerResponseCode.ERRORED as const,
				errors,
			};
		}

		const resultContainer: { parentClasses: ts.ClassDeclaration[] } = {
			parentClasses: [],
		};

		const { transformed: sourceFiles } = ts.transform(this.sourceFiles, [
			addStubsFromHeritage(programTypeChecker, resultContainer),
		]);

		const keywordParser = new KeywordParser(
			sourceFiles,
			resultContainer.parentClasses,
			programTypeChecker
		);

		const keywordData = keywordParser.getClassesAndMethods();

		const postParsingErrors = validator.validateAfterParsing({
			keywords: keywordData,
		});

		if (postParsingErrors) {
			return {
				responseCode: CompilerResponseCode.ERRORED as const,
				errors: postParsingErrors,
			};
		}

		const callHierarchyContainer = new CallHierarchyParser(
			sourceFiles,
			programTypeChecker,
			keywordData
		).parse();

		this.outputMap.set('keywords.json', JSON.stringify(keywordData));
		this.outputMap.set('call-hierarchy-container.json', JSON.stringify(callHierarchyContainer));

		this.program.emit(
			undefined,
			(fileName: string, text: string) => {
				text += `\n({
                    classyKeywords: [${keywordData.map(
						(kw) => `{
                        className: '${kw.className}',
                        properties: ${kw.properties ? JSON.stringify(kw.properties) : 'undefined'},
                        comment: ${`\`${kw.comment}\`` || 'undefined'},
                        flags: ${JSON.stringify(kw.flags)},
                        filePath: '${kw.filePath}',
                        methods: ${JSON.stringify(kw.methods)},
                        class: ${kw.className},
                    }`
					)}]
                })`;
				this.outputMap.set(fileName, text);
			},
			undefined,
			undefined,
			{
				before: [
					removeDecorators(),
					transformCallExpressions(keywordData, this.projectName, programTypeChecker),
				],
			}
		);

		return {
			responseCode: CompilerResponseCode.BUILT as const,
		};
	}
}
