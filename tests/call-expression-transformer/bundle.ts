@Position(1, 1)
class Main {
	constructor(private readonly helper: Helper) {}

	@Position(3, 3)
	less() {
		const k = this.helper;
		const l = k.main;
		const m = l();
	}

	more() {
		const k = this.helper;
		const l = k.main;
		l();
	}
}

@Position(300, 300)
class Helper {
	@Position(3, 3)
	main() {}
}
