import ts from 'typescript';

export function traverseAndFilter<T extends ts.Node>(
	node: ts.Node,
	predicate: (node: ts.Node) => boolean
): T[] {
	const filteredNodes: T[] = [];

	function traverse(currentNode: ts.Node): void {
		if (predicate(currentNode)) {
			filteredNodes.push(currentNode as T);
		}

		ts.forEachChild(currentNode, (child) => {
			traverse(child);
		});
	}

	traverse(node);
	return filteredNodes;
}
