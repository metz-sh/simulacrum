import * as ts from 'typescript';
import * as lodash from 'lodash';
import { createNodeIdForMethod } from '../utils/create-node-id';
import { CompilerException } from '../utils/create-error';
import { CompilerErrorCode } from '../../compliler-error-codes';
import { Graph } from '../../../utils/graph';
import { Keywords } from '../../compiler-types';
import { extractClassAndMethod } from '../../utils/extract-class-and-method';
import parseSymbol from '../../utils/parse-symbol';

type CallGraph = { id: string; isMarked: boolean; isHidden: boolean } & (
	| { isMarked: false }
	| { isMarked: true; className: string; methodName: string }
);

export type CallHierarchyContainer = {
	source: { className: string; methodName: string; id: string; isHidden: boolean };
	destination: { className: string; methodName: string; id: string; isHidden: boolean };
}[];
export class CallHierarchyParser {
	private keywordsMap = new Map<string, { isMarked: boolean; isHidden: boolean }>();
	constructor(
		private readonly sourcefiles: ts.SourceFile[],
		private readonly checker: ts.TypeChecker,
		keywords: Keywords,
		private readonly prefix?: string
	) {
		this.createKeywordsMap(keywords);
	}

	private createKeywordsMap(keywords: Keywords) {
		for (const kw of keywords) {
			this.keywordsMap.set(`${kw.className}`, {
				isHidden: !!kw.flags.isHidden,
				isMarked: kw.flags.isMarked,
			});
			for (const method of kw.methods) {
				this.keywordsMap.set(`${kw.className}.${method.methodName}`, {
					isHidden: !!method.flags.isHidden,
					isMarked: method.flags.isMarked,
				});
			}
		}
	}

	private getFQNForFlowAwait(node: ts.CallExpression, sourceFile: ts.SourceFile) {
		if (!ts.isPropertyAccessExpression(node.expression)) {
			throw new CompilerException(
				`await expression at ${node.getText()} seems to be malformed!`
			)
				.set('code', CompilerErrorCode.MALFORMED_FLOW_TYPE)
				.addHighlights([node.getText()])
				.addSource({
					sourceFile,
					node,
				});
		}
		const flowProperty = node.expression.expression;
		return this.getFqnFromFlowExpression(flowProperty, sourceFile);
	}

	private getFqnFromFlowExpression(node: ts.Expression, sourceFile: ts.SourceFile) {
		const type = this.checker.getTypeAtLocation(node) as ts.Type & {
			resolvedTypeArguments?: ts.Type[];
		};
		const typeArgs = type.resolvedTypeArguments;

		if (!typeArgs || typeArgs.length !== 2) {
			throw new CompilerException(
				`Awaited flow at ${node.getText()} seems to have its type arguments malformed!`
			)
				.set('code', CompilerErrorCode.MALFORMED_FLOW_TYPE)
				.addHighlights([node.getText()])
				.addSource({
					sourceFile,
					node,
				});
		}

		return this.checker.getFullyQualifiedName(typeArgs[1].symbol);
	}

	private getCalleeFQNs(symbol: ts.Symbol, sourceFile: ts.SourceFile, node: ts.CallExpression) {
		let fqn = this.checker.getFullyQualifiedName(symbol);

		if (fqn === 'std.FlowExecutor.await') {
			fqn = this.getFQNForFlowAwait(node, sourceFile);
		}

		if (fqn === 'std.awaitAll' || fqn === 'std.awaitRace') {
			const flows = (node.arguments[0] as ts.ArrayLiteralExpression).elements;
			const fqns = flows.map((node) => this.getFqnFromFlowExpression(node, sourceFile));
			return fqns;
		}

		return [fqn];
	}

	private populateGraph(
		node: ts.CallExpression,
		sourceFile: ts.SourceFile,
		className: string,
		methodName: string,
		identifier: ts.Identifier,
		type: ts.Type,
		graph: Graph<CallGraph>
	) {
		const { symbol, isSymbolForbidden } = parseSymbol(type);
		if (isSymbolForbidden) {
			return;
		}

		if (!symbol) {
			if (type.isUnion()) {
				for (const subtype of type.types) {
					this.populateGraph(
						node,
						sourceFile,
						className,
						methodName,
						identifier,
						subtype,
						graph
					);
				}
				return;
			}
			console.error('symbol not found', identifier.text, node.getFullText(), type);
			throw new CompilerException(
				`Encountered some issues while creating call graph and parsing ${node.getText()}.\n\nPlease check console logs.`
			)
				.set('code', CompilerErrorCode.UNKNOWN)
				.addHighlights([node.getText()])
				.addSource({
					sourceFile,
					node,
				});
		}

		const fqns = this.getCalleeFQNs(symbol, sourceFile, node);

		const parent = ts.findAncestor(
			node,
			(node) =>
				ts.isFunctionDeclaration(node) ||
				ts.isFunctionExpression(node) ||
				ts.isArrowFunction(node)
		);

		for (const fqn of fqns) {
			const keywordData = this.keywordsMap.get(fqn);
			const parentFqn = (() => {
				if (parent) {
					const type = this.checker.getTypeAtLocation(parent);
					const parentFqn = this.checker.getFullyQualifiedName(type.getSymbol()!);
					graph.addVertex({ id: parentFqn, isMarked: false, isHidden: false });
					return parentFqn;
				}

				return `${className}.${methodName}`;
			})();

			const vertex = (() => {
				let result = {
					id: fqn,
				};
				if (keywordData?.isMarked) {
					const { className, methodName } = extractClassAndMethod(fqn);
					return {
						...result,
						isMarked: keywordData.isMarked,
						isHidden: keywordData.isHidden,
						className,
						methodName,
					};
				}

				return {
					...result,
					isMarked: false,
					isHidden: true,
				} as const;
			})();

			graph.addVertex(vertex);
			graph.addEdge(parentFqn, fqn);
		}
	}

	private visitCallExpression(
		node: ts.Node,
		sourceFile: ts.SourceFile,
		className: string,
		methodName: string,
		graph: Graph<CallGraph>
	) {
		if (ts.isCallExpression(node)) {
			const identifier = node.expression as ts.Identifier;
			const type = this.checker.getTypeAtLocation(identifier);
			this.populateGraph(node, sourceFile, className, methodName, identifier, type, graph);
		}
		ts.forEachChild(node, (node) =>
			this.visitCallExpression(node, sourceFile, className, methodName, graph)
		);
	}

	private visitMethodDeclaration(
		node: ts.Node,
		sourceFile: ts.SourceFile,
		className: string,
		container: CallHierarchyContainer
	) {
		if (ts.isMethodDeclaration(node)) {
			const methodName = (node.name as ts.Identifier).escapedText as string;
			const graph = new Graph<CallGraph>();
			graph.addVertex({ id: `${className}.${methodName}`, isMarked: false, isHidden: false });

			node.body?.statements.forEach((statement) => {
				this.visitCallExpression(statement, sourceFile, className, methodName, graph);
			});

			const outgoingCalls = graph.findAll(
				(v) => !!v.isMarked,
				`${className}.${methodName}`
			) as (CallGraph & { isMarked: true })[];

			for (const call of outgoingCalls) {
				container.push({
					source: {
						id: createNodeIdForMethod(className, methodName, this.prefix),
						className,
						methodName,
						isHidden: this.keywordsMap.get(`${className}.${methodName}`)!.isHidden,
					},
					destination: {
						id: createNodeIdForMethod(call.className, call.methodName, this.prefix),
						className: call.className,
						methodName: call.methodName,
						isHidden: call.isHidden,
					},
				});
			}
		}
		ts.forEachChild(node, (node) =>
			this.visitMethodDeclaration(node, sourceFile, className, container)
		);
	}

	private visitClassDeclaration(
		node: ts.Node,
		sourceFile: ts.SourceFile,
		container: CallHierarchyContainer
	) {
		if (ts.isClassDeclaration(node)) {
			const className = node.name!.escapedText as string;
			const isHidden = this.keywordsMap.get(className)?.isHidden;
			if (isHidden) {
				return;
			}

			this.visitMethodDeclaration(node, sourceFile, className, container);
		}
		ts.forEachChild(node, (node) => this.visitClassDeclaration(node, sourceFile, container));
	}

	parse() {
		const result: CallHierarchyContainer = [];
		this.sourcefiles.forEach((sf) => {
			ts.forEachChild(sf, (node) => {
				this.visitClassDeclaration(node, sf, result);
			});
		});

		return result;
	}

	private getJumpHiddenCalls(callContainer: CallHierarchyContainer) {
		const hiddenSinks = callContainer
			.map((call, index) => ({ ...call, index }))
			.filter((call) => call.destination.isHidden);
		const hiddenSources = callContainer
			.map((call, index) => ({ ...call, index }))
			.filter((call) => call.source.isHidden);

		const groupedByHiddenDestination = new Map<number, typeof hiddenSinks>();

		hiddenSinks.forEach((hiddenDestination) => {
			const matchingSources = hiddenSources.filter((ch) =>
				lodash.isEqual(ch.source.id, hiddenDestination.destination.id)
			);

			groupedByHiddenDestination.set(hiddenDestination.index, matchingSources);
		});

		const jumpedEdges = (() => {
			const result: CallHierarchyContainer = [];
			for (const [index, calls] of groupedByHiddenDestination.entries()) {
				const hiddenDestinationCall = callContainer[index];
				calls.forEach((call) => {
					result.push({
						source: hiddenDestinationCall.source,
						destination: call.destination,
					});
				});
			}

			return result;
		})();

		const indexsToBeFiltered = [
			...hiddenSinks.map((_) => _.index),
			...hiddenSources.map((_) => _.index),
		];

		const result = [
			...callContainer.filter((_, index) => !indexsToBeFiltered.includes(index)),
			...jumpedEdges,
		];

		return result;
	}
}
