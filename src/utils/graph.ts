export class Graph<T extends { id: string }> {
	private vertices: Map<string, T>;
	private adjacencyList: Map<string, string[]>;

	constructor() {
		this.vertices = new Map();
		this.adjacencyList = new Map();
	}

	// Adds a new vertex to the graph
	addVertex(vertex: T): void {
		if (!this.vertices.has(vertex.id)) {
			this.vertices.set(vertex.id, vertex);
			this.adjacencyList.set(vertex.id, []);
		}
	}

	// Adds a directed edge from parent (parent.id) to child (child.id)
	addEdge(parentId: string, childId: string): void {
		if (!this.vertices.has(parentId) || !this.vertices.has(childId)) {
			console.warn(`One or both vertices not found: ${parentId}, ${childId}`);
			return;
		}

		let children = this.adjacencyList.get(parentId);
		if (children) {
			children.push(childId);
		}
	}

	// Find all vertices for which the predicate returns true
	findAll(predicate: (vertex: T) => boolean, startId: string): T[] {
		if (!this.vertices.has(startId)) {
			console.warn(`Start vertex not found: ${startId}`);
			return [];
		}

		const visited = new Set<string>();
		const result: T[] = [];

		const dfs = (vertexId: string) => {
			if (!this.adjacencyList.has(vertexId) || visited.has(vertexId)) {
				return;
			}

			visited.add(vertexId);
			const vertex = this.vertices.get(vertexId);

			if (vertex && predicate(vertex)) {
				result.push(vertex);
			}

			this.adjacencyList.get(vertexId)?.forEach((neighborId) => {
				dfs(neighborId);
			});
		};

		//Skip the starter vertex
		this.adjacencyList.get(startId)?.forEach((neighborId) => {
			dfs(neighborId);
		});

		return result;
	}

	// Optional: Display the graph
	display(): void {
		this.adjacencyList.forEach((values, key) => {
			console.log(`${key}: ${values.join(', ')}`);
		});
	}
}
