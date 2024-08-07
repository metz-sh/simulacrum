import { Meta, StoryObj } from '@storybook/react';

import { MantineProvider } from '@mantine/core';
import { Editor } from '../index';
import { memo, useCallback, useEffect, useState } from 'react';
import { bundle, sampleArtifacts } from './sample-artifacts';

const meta: Meta<typeof Editor> = {
	title: 'components/event',
	tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof Editor>;
const files = [
	{
		path: 'app/event-manager.ts',
		type: 'file' as const,
		value: `
		type Address = {
    startingAddress: string,
    offset: string,
}


class Channel {
    private receivers = new Map<std.FlowFunction<any, 'immediate'>, true>();
    constructor(
        private slug: string,
        private name: string,
        private readonly senderAddress: Address,
    ) {

    }

    onEmit(data: any) {
        const flowFactories = Array.from(this.receivers, ([ff]) => ff);
        std.log('ff registered', flowFactories.length);
        for(const ff of flowFactories) {
            std.log('Got something!');
            ff(data).run();
        }
    }

    addReceiver(flowFactory: std.FlowFunction<any, 'immediate'>) {
        this.receivers.set(flowFactory, true);

        return () => {
            this.receivers.delete(flowFactory);
        }
    }
}

class ChannelEmitter {
    constructor(readonly channel: Channel) {

    }

    emit(data: any) {
        this.channel.onEmit(data);
    }
}

/**
 * Must manage all channels
 */
@Injectable
class EventManager {
    private channelMap = new Map<string, Channel>();

    createChannelEmitter(params: {
        slug: string,
        name: string,
        senderAddress: Address,
    }) {
        if(this.channelMap.has(params.slug)) {
            return 'Channel already exists'
        }
        const channel = new Channel(params.slug, params.name, params.senderAddress);
        this.channelMap.set(params.slug, channel);

        return new ChannelEmitter(channel);
    }

    destroyChannel(slug: string) {
        this.channelMap.delete(slug);
    }

    registerChannelListener(slug: string, ff: std.FlowFunction<any, 'immediate'>) {
        const channel = this.channelMap.get(slug);
        if(!channel) {
            return 'No such channel';
        }

        return channel.addReceiver(ff);
    }
}

    `,
	},
	{
		path: 'app/user-land.ts',
		type: 'file' as const,
		value: `@Injectable
class EmitsSomething {
    eventManager = std.resolve(EventManager);

    someWork() {
        const emitter = this.eventManager.createChannelEmitter({
            slug: 'test',
            name: 'Testing something',
            senderAddress: {
                startingAddress: 'na',
                offset: 'na',
            }
        })
        if(typeof emitter === 'string') {
            return 500;
        }
        std.sleep(15);
        emitter.emit('something!');
    }
}

@Injectable
class Listens {
    eventManager = std.resolve(EventManager);

    register() {
        std.sleep(5);
        this.eventManager.registerChannelListener('test', std.flow('Listener', std.resolve(Listens)).someOtherWork)
    }

    someOtherWork(...args: any[]) {
        std.log('Got something', ...args);
    }
}`,
	},
];

const CodeDaemon = memo((props: {}) => {
	return (
		<MantineProvider withGlobalStyles withNormalizeCSS>
			<Editor
				enableModalProvider
				onMount={({ stateChangeObservable: obs, analyticsObservable: aobs }) => {
					obs.subscribe(console.log);
					// aobs.subscribe(console.log);
				}}
				projectName="test"
				project={files}
				height="100vh"
				build={{
					state: 'uninitiated',
				}}
				storySetups={[
					{
						title: 'Fetch user',
						id: '0',
						script: {
							raw: `std.flow("Register", std.resolve(Listens)).register().run();
std.flow("Subscribe", std.resolve(EmitsSomething)).someWork().run();`,
							compiled: `std.flow("Register", std.resolve(Listens)).register().run();
std.flow("Subscribe", std.resolve(EmitsSomething)).someWork().run();`,
						},
					},
				]}
			/>
		</MantineProvider>
	);
});

export const withIDE: Story = {
	render: () => {
		return <CodeDaemon />;
	},
};
