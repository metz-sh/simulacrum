import * as ts from 'typescript';
import { removeWhitespace } from '../remove-whitespace';
import { CompilerException } from '../create-error';
import { CompilerErrorCode } from '../../../compliler-error-codes';
import { ShowDecorator, parseClassDecorator, parseMethodDecorator } from './decorators';
import { Keywords, Keyword, ParsedMethod } from '../../../compiler-types';
import { traverseAndFilter } from '../../../utils/traverse-and-filter';
import { getFQNsOfCall } from '../../../utils/get-fqn-of-call';
import { extractClassAndMethod } from '../../../utils/extract-class-and-method';

export class KeywordParser {
	constructor(
		private sourceFiles: readonly ts.SourceFile[],
		private readonly classesToHide: ts.ClassDeclaration[],
		private readonly checker: ts.TypeChecker
	) {}

	getClassesAndMethods() {
		const data: Keywords = [];

		this.sourceFiles.forEach((sf) => {
			const filePath = sf.fileName;
			const classDeclarations = sf.statements.filter(
				(s) => s.kind === ts.SyntaxKind.ClassDeclaration
			);
			for (const classDeclaration of classDeclarations) {
				const result = this.parseClass(
					sf,
					classDeclaration as ts.ClassDeclaration,
					filePath
				);
				data.push(result);
			}
		});

		return data;
	}

	private parseMethod(
		sf: ts.SourceFile,
		method: ts.MethodDeclaration,
		isClassMarked: boolean,
		isClassHidden: boolean,
		classFlags: Partial<Keyword['flags']>
	): ParsedMethod | undefined {
		const methodName = (method.name as ts.Identifier).escapedText! as string;
		if (!isClassMarked) {
			return {
				methodName,
				flags: {
					isHidden: isClassHidden,
					isMarked: false,
				},
			};
		}

		const modifiers = ts.getModifiers(method);
		const isPrivate = modifiers?.find(
			(modifer) => modifer.kind === ts.SyntaxKind.PrivateKeyword
		);
		const delegateToParent = !!classFlags.view?.type;
		return {
			methodName,
			comment: this.parseComment(method),
			...this.parseSignatureAndArgumentHashes(method),
			flags: {
				isMarked: !isPrivate,
				isHidden: isClassHidden,
				delegateToParent,
			},
		};
	}

	private parseClass(
		sourceFile: ts.SourceFile,
		classDeclaration: ts.ClassDeclaration,
		filePath: string
	): Keywords[0] {
		const className = classDeclaration.name?.escapedText! as string;
		const typeParametersLength = classDeclaration.typeParameters?.length || 0;
		const isClassMarked = true;
		const isClassHidden = this.classesToHide
			.map((_) => _.name?.getText())
			.filter((_) => !!_)
			.includes(classDeclaration.name?.getText());

		const rawMethodDeclarations = classDeclaration.members.filter(
			(node) => node.kind === ts.SyntaxKind.MethodDeclaration
		) as ts.MethodDeclaration[];
		const methodDeclarations = rawMethodDeclarations.filter((node) => {
			const modifiers = ts.getModifiers(node);
			const isAbstract = modifiers?.find(
				(modifer) => modifer.kind === ts.SyntaxKind.AbstractKeyword
			);

			if (isAbstract) {
				return false;
			}

			return true;
		});
		const decorators = classDeclaration.modifiers?.filter((modifier) =>
			ts.isDecorator(modifier)
		) as ts.Decorator[];
		const classFlags = this.parseClassFlags(decorators);
		const parsedMethods = methodDeclarations
			.map((method) =>
				this.parseMethod(sourceFile, method, isClassMarked, isClassHidden, classFlags)
			)
			.filter((_) => !!_) as ParsedMethod[];
		const properties = this.parseProperties(classDeclaration);
		if (!isClassMarked) {
			return {
				className,
				filePath,
				properties,
				flags: {
					isMarked: false,
					isHidden: isClassHidden,
					isConstructorBased: true,
				},
				methods: parsedMethods,
				channelEmitters: [],
				typeParametersLength,
			};
		}

		const channelEmitters = this.parseChannelEmitters(classDeclaration);

		const parsedClass: Keyword = {
			className,
			comment: this.parseComment(classDeclaration),
			properties,
			filePath,
			flags: {
				isMarked: true,
				isHidden: isClassHidden,
				isConstructorBased: true,
				...classFlags,
			},
			methods: parsedMethods,
			channelEmitters,
			typeParametersLength,
		};

		const viewType = parsedClass.flags.view?.type;
		if (viewType === 'table' || viewType === 'collection' || viewType === 'keyvalue') {
			const propertiesBeingTracked = parsedClass.properties.filter((p) => p.show);
			if (propertiesBeingTracked.length > 1) {
				const violatingPropeties = propertiesBeingTracked.map((p) => p.name).join(', ');
				throw new CompilerException(
					`With ${viewType} view you can only show one property. Looks like you are showing: ${violatingPropeties}`
				)
					.set('code', CompilerErrorCode.TABLE_VIEW_TOO_MANY_SOURCES)
					.addHighlights([violatingPropeties])
					.addSource({
						sourceFile,
						node: classDeclaration,
					});
			}
			if (propertiesBeingTracked.length === 0) {
				throw new CompilerException(
					`With ${viewType} view you need to mark a data source using @Show`
				)
					.set('code', CompilerErrorCode.TABLE_VIEW_TOO_FEW_SOURCES)
					.addSource({
						sourceFile,
						node: classDeclaration,
					});
			}
		}

		return parsedClass;
	}

	parseChannelEmitters(classDeclaration: ts.ClassDeclaration) {
		const result = traverseAndFilter<ts.CallExpression>(classDeclaration, (node) => {
			if (!ts.isCallExpression(node)) {
				return false;
			}

			const fqns = getFQNsOfCall(node.expression, this.checker);
			if (fqns.length > 1) {
				return false;
			}

			const fqn = fqns[0];

			return fqn === 'std.createChannelEmitter';
		});

		if (!result.length) {
			return [];
		}

		const channelEmitters = result.map((r) => ({
			slug: (r.arguments[0] as ts.StringLiteral).text,
			type: r.typeArguments?.at(0)?.getFullText() || 'undefined',
		}));

		return channelEmitters;
	}

	private parseProperties(classDeclaration: ts.ClassDeclaration) {
		const propertDeclarations = classDeclaration.members.filter(
			(m) => m.kind === ts.SyntaxKind.PropertyDeclaration
		) as ts.PropertyDeclaration[];
		return propertDeclarations.map((declaration) => {
			const decorators = (declaration.modifiers?.filter((modifier) =>
				ts.isDecorator(modifier)
			) || []) as ts.Decorator[];
			const parsedDecorators = decorators.map((d) => parseMethodDecorator(d));
			const isShow = !!parsedDecorators.find((d) => d instanceof ShowDecorator);
			const result = {
				name: declaration.name.getText(),
				show: isShow,
			};
			return result;
		});
	}

	private parseClassFlags(decorators: ts.Decorator[]): Partial<Keyword['flags']> {
		if (!decorators) {
			return {};
		}
		if (!decorators.length) {
			return {};
		}

		const parsedDecorators = decorators.map((d) => parseClassDecorator(d));

		const result = parsedDecorators.reduce(
			(acc, cur) => {
				if (!cur) {
					return acc;
				}
				acc = {
					...acc,
					...cur.getClassFlags(),
				};

				return acc;
			},
			{} as Partial<Keyword['flags']>
		);

		return result;
	}

	private parseComment(node: ts.MethodDeclaration | ts.ClassDeclaration) {
		if (!this.checker) {
			return;
		}
		const comments = ts.displayPartsToString(
			this.checker
				.getSymbolAtLocation(node.name || node)!
				.getDocumentationComment(this.checker)
		);
		return comments;
	}

	private parseSignatureAndArgumentHashes(node: ts.MethodDeclaration) {
		if (!this.checker) {
			return;
		}
		const symbol = this.checker.getSymbolAtLocation(node.name);
		if (!symbol) {
			return;
		}

		const signature = this.checker.getSignatureFromDeclaration(node);
		if (!signature) {
			return;
		}

		const type = this.checker.getTypeOfSymbol(symbol);
		const parameters = node.parameters;
		return {
			signature: this.checker.typeToString(type),
			parameters: parameters.map((p) => ({
				name: p.name.getText(),
				type: this.checker.typeToString(this.checker.getTypeAtLocation(p)),
				text: p.getText(),
			})),
			returnType: this.checker.typeToString(this.checker.getReturnTypeOfSignature(signature)),
		};
	}
}
