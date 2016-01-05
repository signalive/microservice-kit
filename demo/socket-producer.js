'use strict';

const MicroserviceKit = require('../src');


const microserviceKit = new MicroserviceKit({
    type: 'socket-producer',
    config: null, // Dont use config file!
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

        const broadcastExchange = microserviceKit.amqpKit.getExchange('socket-broadcast');
        const directExchange = microserviceKit.amqpKit.getExchange('socket-direct');

        broadcastExchange
            .publishEvent(
                '',
                'signa.socket.broadcast.update-channel',
                {txt: 'channel update detail here.'},
                {dontExpectRpc: true}
            )
            .then((response) => {
                console.log('Sent pubsub message.');
            })
            .catch((err) => {
                console.log('Cannot send pubsub message.');
            });

        broadcastExchange
            .publishEvent(
                '',
                'signa.socket.broadcast.new-app-version',
                {txt: 'new app version falan.'},
                {dontExpectRpc: true}
            )
            .then((response) => {
                console.log('Sent pubsub message.');
            })
            .catch((err) => {
                console.log('Cannot send pubsub message.');
            });

        // Direct
        directExchange
            .publishEvent(
                'device-uuid',
                'signa.socket.direct.update-device',
                {txt:'Update device falan.'}
            )
            .then((response) => {
                console.log('Positive response: ' + JSON.stringify(response));
            })
            .catch((err) => {
                console.log('Negative response: ' + err);
            });

        directExchange
            .publishEvent(
                'device-uuid',
                'signa.socket.direct.screenshot',
                {txt:'Screenshot request kanka.'}
            )
            .then((response) => {
                console.log('Positive response: ' + JSON.stringify(response));
            })
            .catch((err) => {
                console.log('Negative response: ' + err);
            });

    })
    .catch((err) => {
        console.log('Cannot boot');
        console.log(err);
    });
