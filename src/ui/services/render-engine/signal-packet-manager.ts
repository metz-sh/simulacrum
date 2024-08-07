export class SignalPacketManager {
	private sequence = 0;
	private pool: Map<string, string[]> = new Map();
	private activeConnection: Map<string, string> = new Map();
	private packetEdgeMap: Map<string, string> = new Map();

	constructor(private readonly namespace: string) {}

	private setActiveConnection(flowId: string, edgeId: string, packetId: string) {
		const connnectionString = this.createConnectionString(flowId, edgeId);
		this.activeConnection.set(connnectionString, packetId);
		this.packetEdgeMap.set(packetId, edgeId);
	}

	private deleteActiveConnection(flowId: string, edgeId: string, packetId: string) {
		const connnectionString = this.createConnectionString(flowId, edgeId);
		this.activeConnection.delete(connnectionString);
		this.packetEdgeMap.delete(packetId);
	}

	private addToPool(edgeId: string) {
		const pool = (() => {
			const entry = this.pool.get(edgeId);
			if (!entry) {
				const emptyPool: string[] = [];
				this.pool.set(edgeId, emptyPool);
				return emptyPool;
			}
			return entry;
		})();

		const packetId = this.createPacket(edgeId);
		pool.push(packetId);
		return packetId;
	}

	resetActiveConnections() {
		this.activeConnection = new Map();
	}

	getActiveConnections() {
		const result = Array.from(this.activeConnection, ([connectionString, packetId]) => ({
			...this.deconstructConnectionString(connectionString),
			packetId,
		}));

		return result;
	}

	acquire(flowId: string, edgeId: string) {
		const connnectionString = this.createConnectionString(flowId, edgeId);
		const existingConnection = this.activeConnection.get(connnectionString);
		if (existingConnection) {
			return existingConnection;
		}
		const pool = this.pool.get(edgeId);
		const pooledPacketId = (() => {
			if (pool && pool.length) {
				return pool.pop()!;
			}

			return this.addToPool(edgeId);
		})();

		this.setActiveConnection(flowId, edgeId, pooledPacketId);

		return pooledPacketId;
	}

	release(flowId: string, edgeId: string, packetId: string) {
		this.deleteActiveConnection(flowId, edgeId, packetId);

		const pool = this.pool.get(edgeId);
		if (!pool) {
			throw new Error(`Trying to release but cannot find pool for edge ${edgeId}`);
		}
		pool.push(packetId);
	}

	getActivePacketEdgeMap() {
		return this.packetEdgeMap;
	}

	private createConnectionString(flowId: string, edgeId: string) {
		return `${flowId}.${edgeId}`;
	}

	private deconstructConnectionString(connectionString: string) {
		const [flowId, edgeId] = connectionString.split('.');
		return {
			flowId,
			edgeId,
		};
	}

	private createPacket(edgeId: string) {
		const id = `${this.namespace}_${(++this.sequence).toString()}_signal_packet`;
		const divNode = document.createElement('div');
		divNode.style.setProperty('position', 'absolute');
		divNode.style.setProperty('width', '12px');
		divNode.style.setProperty('height', '12px');
		divNode.style.setProperty('border-radius', '100%');
		divNode.style.setProperty('background-color', 'white');
		divNode.style.setProperty('top', '-6px');
		divNode.style.setProperty('left', '-6px');
		divNode.style.setProperty('opacity', '0');
		divNode.setAttribute('id', id);

		const olderSibling = document.getElementById(`${edgeId}_signal_packet`);
		if (!olderSibling) {
			throw new Error(`Could not find older sibling packet for edge id: ${edgeId}`);
		}

		if (!olderSibling.parentNode) {
			throw new Error(`Could not find parent dom node for sibling packet on edge: ${edgeId}`);
		}
		olderSibling.parentNode.insertBefore(divNode, olderSibling.nextSibling);

		return id;
	}
}
