import { Channel, ChannelListener } from './channel';
import { ChannelEmitter } from './channel-emitter';

export class EventManager {
	private channelMap = new Map<string, Channel>();

	createChannelEmitter(params: { slug: string; name: string }) {
		if (this.channelMap.has(params.slug)) {
			throw new Error('Channel already exists!');
		}
		const channel = new Channel(params.slug, params.name);
		this.channelMap.set(params.slug, channel);

		return new ChannelEmitter(channel);
	}

	destroyChannel(slug: string) {
		this.channelMap.delete(slug);
	}

	registerChannelListener(slug: string, listener: ChannelListener) {
		const channel = this.channelMap.get(slug);
		if (!channel) {
			throw new Error('No such channel!');
		}

		return channel.addListener(listener);
	}

	getActiveChannels() {
		return Array.from(this.channelMap, ([_, channel]) => channel);
	}

	reset() {
		this.channelMap.clear();
	}
}
