'use strict';

const MicroserviceKit = require('../src');


const SOCKET_BROADCAST_EXCHANGE = 'signa.socket.broadcast';
const SOCKET_DIRECT_EXCHANGE = 'signa.socket.direct';
const microserviceKit = new MicroserviceKit();

microserviceKit
    .init()
    .then(() => {
        // Config phase
        return Promise.all([
            microserviceKit.assertQueue('', {exclusive: true}),
            microserviceKit.assertQueue('', {exclusive: true}),
            microserviceKit.assertExchange(SOCKET_BROADCAST_EXCHANGE, 'fanout', {}),
            microserviceKit.assertExchange(SOCKET_DIRECT_EXCHANGE, 'direct', {})
        ]);
    })
    .then((results) => {
        // Run phase
        const broadcastConsumptionQueue = results[0];
        const directConsumptionQueue = results[1];

        console.log("Waiting for messages in %s and %s. To exit press CTRL+C", broadcastConsumptionQueue.queue, directConsumptionQueue.queue);

        // Bind to broadcast exchange
        microserviceKit.bindQueue(broadcastConsumptionQueue.queue, SOCKET_BROADCAST_EXCHANGE, '');


        /**
         * On device connect
         */
        function onDeviceConnect(device) {
            microserviceKit.bindQueue(directConsumptionQueue.queue, SOCKET_DIRECT_EXCHANGE, device.uuid);
        }

        /**
         * On device disconnect
         */
        function onDeviceDisconnect(device) {
            microserviceKit.unbindQueue(directConsumptionQueue.queue, SOCKET_DIRECT_EXCHANGE, device.uuid);
        }

        // Randomly bind for a device for test purposes
        if (Math.random() >= 0.5) {
            var device = {uuid: 'device-uuid'};
            console.log('Binded for ', device);
            onDeviceConnect(device);
        }


        /**
         * Consume socket jobs!
         */
        microserviceKit.consumeEvent(broadcastConsumptionQueue.queue, 'signa.socket.broadcast.update-channel', (data) => {
            console.log("Received channel update: " + JSON.stringify(data));
        }, {noAck: true});

        microserviceKit.consumeEvent(broadcastConsumptionQueue.queue, 'signa.socket.broadcast.new-app-version', (data) => {
            console.log("Received new app version: " + JSON.stringify(data));
        }, {noAck: true});

        microserviceKit.consumeEvent(directConsumptionQueue.queue, 'signa.socket.direct.update-device', (data, callback) => {
            console.log("Received update device: " + JSON.stringify(data));
            callback(null, {some: 'device updated kanka, no worries.'});
        });

        microserviceKit.consumeEvent(directConsumptionQueue.queue, 'signa.socket.direct.screenshot', (data, callback) => {
            console.log("Received update device: " + JSON.stringify(data));

            setTimeout(() => {
                let rand = Math.random();
                callback(null, {some: 'screenshot ' + rand});
                console.log("Done screenshot.request " + rand);
              }, 5000);
        });
    })
    .catch((err) => {
        console.log('Cannot boot');
        console.log(err);
    });
