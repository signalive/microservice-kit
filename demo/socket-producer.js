'use strict';

const MicroserviceKit = require('../src');

const amqpKit = new MicroserviceKit.AmqpKit();

amqpKit
    .init({
        url: 'amqp://arzcmdsz:jcN7Ft4AXKkMvcisYDEKu4fbqK-brTjH@hare.rmq.cloudamqp.com/arzcmdsz',
        alias: 'SocketProducer0',
        exchanges: [
            {
                name: 'SocketWorker.broadcast',
                type: 'fanout',
                options: {}
            },
            {
                name: 'SocketWorker.direct',
                type: 'direct',
                options: {}
            }
        ]
    })
    .then(() => {
        // Run phase
        // Broadcast

        let broadcastExchange = amqpKit.getExchange('SocketWorker.broadcast');
        let directExchange = amqpKit.getExchange('SocketWorker.direct');

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
                console.log('Negative response: ' + JSON.stringify(err));
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
                console.log('Negative response: ' + JSON.stringify(err));
            });

    })
    .catch((err) => {
        console.log('Cannot boot');
        console.log(err);
    });
