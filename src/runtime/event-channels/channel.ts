import { FlowExecutor } from '../flow-executor';

export type ChannelListener = (...args: any[]) => FlowExecutor;

export class Channel {
	private receivers = new Set<ChannelListener>();

	private slug: string;

	constructor(slug: string) {
		this.slug = slug;
	}

	onEmit(data: any) {
		const flowFactories = Array.from(this.receivers);
		for (const ff of flowFactories) {
			ff(data).run();
		}
	}

	addListener(listener: ChannelListener) {
		this.receivers.add(listener);

		return () => {
			this.receivers.delete(listener);
		};
	}

	getIdentity() {
		return {
			slug: this.slug,
		};
	}
}
