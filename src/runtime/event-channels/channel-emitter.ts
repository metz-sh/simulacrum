import { Channel } from './channel';

export class ChannelEmitter {
	constructor(readonly channel: Channel) {}

	emit(data: any) {
		this.channel.onEmit(data);
	}
}
