export class PendingQueue<T extends string | number> {
	private queue: Set<T> = new Set();

	push(elem: T) {
		this.queue.add(elem);
	}

	getElements() {
		return this.queue;
	}

	flush() {
		const data = Array.from(this.queue);
		this.queue.clear();
		return data;
	}
}
