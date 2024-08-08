import { FlowExecutor } from '../flow-executor';
import { Address } from '../heap';

export type ChannelListener = (...args: any[]) => FlowExecutor;

export class Channel {
	private receivers = new Set<ChannelListener>();

	private slug: string;
	private name: string;

	constructor(slug: string, name: string) {
		this.slug = slug;
		this.name = name;
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
			name: this.name,
		};
	}
}
