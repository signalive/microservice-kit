'use strict';

const MicroserviceKit = require('../src');


const SOCKET_BROADCAST_EXCHANGE = 'signa.socket.broadcast';
const SOCKET_DIRECT_EXCHANGE = 'signa.socket.direct';
const microserviceKit = new MicroserviceKit();

microserviceKit
    .init()
    .then(() => {
        // Run phase
        // Broadcast
        microserviceKit
            .publishEvent(
                SOCKET_BROADCAST_EXCHANGE,
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

        microserviceKit
            .publishEvent(
                SOCKET_BROADCAST_EXCHANGE,
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
        microserviceKit
            .publishEvent(
                SOCKET_DIRECT_EXCHANGE,
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

        microserviceKit
            .publishEvent(
                SOCKET_DIRECT_EXCHANGE,
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
