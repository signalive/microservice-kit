import MicroserviceKit from '../src';

const microserviceKit = new MicroserviceKit({
    type: 'socket-producer',
    amqp: {
        exchanges: [
            {
                name: 'socket-broadcast',
                key: 'socket-broadcast',
                type: 'fanout',
                options: {}
            },
            {
                name: 'socket-direct',
                key: 'socket-direct',
                type: 'direct',
                options: {}
            }
        ]
    }
});

microserviceKit
    .init()
    .then(() => {
        // Run phase
        // Broadcast

        const broadcastExchange = microserviceKit.amqpKit!.getExchange('socket-broadcast')!;
        const directExchange = microserviceKit.amqpKit!.getExchange('socket-direct')!;

        broadcastExchange
            .publishEvent(
                '',
                'signa.socket.broadcast.update-channel',
                { txt: 'channel update detail here.' },
                { dontExpectRpc: true }
            )
            .then((response: any) => {
                console.log('Sent pubsub message.');
            })
            .catch((err: Error) => {
                console.log('Cannot send pubsub message.');
            });

        broadcastExchange
            .publishEvent(
                '',
                'signa.socket.broadcast.new-app-version',
                { txt: 'new app version falan.' },
                { dontExpectRpc: true }
            )
            .then((response: any) => {
                console.log('Sent pubsub message.');
            })
            .catch((err: Error) => {
                console.log('Cannot send pubsub message.');
            });

        // Direct
        directExchange
            .publishEvent(
                'device-uuid',
                'signa.socket.direct.update-device',
                { txt: 'Update device falan.' }
            )
            .then((response: any) => {
                console.log('Positive response: ' + JSON.stringify(response));
            })
            .catch((err: Error) => {
                console.log('Negative response: ' + err);
            });

        directExchange
            .publishEvent(
                'device-uuid',
                'signa.socket.direct.screenshot',
                { txt: 'Screenshot request kanka.' }
            )
            .then((response: any) => {
                console.log('Positive response: ' + JSON.stringify(response));
            })
            .catch((err: Error) => {
                console.log('Negative response: ' + err);
            });

    })
    .catch((err: Error) => {
        console.log('Cannot boot');
        console.log(err);
    });

