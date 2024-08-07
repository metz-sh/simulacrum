export class PlayerStack<T extends { id: string | number }> {
	private stack: T[] = [];

	push(elem: T) {
		this.stack.push(elem);
	}

	peek() {
		return this.stack[this.stack.length - 1];
	}

	pop() {
		if (this.stack.length === 1) {
			return this.stack[0];
		}
		return this.stack.pop()!;
	}
}
