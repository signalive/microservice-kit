'use strict';

const MicroserviceKit = require('../src');


const SOCKET_BROADCAST_EXCHANGE = 'signa.socket.broadcast';
const SOCKET_DIRECT_EXCHANGE = 'signa.socket.direct';
const amqpKit = new MicroserviceKit.AmqpKit();

amqpKit
    .init()
    .then(() => {
        // Config phase
        return Promise.all([
            amqpKit.assertQueue('', {exclusive: true}),
            amqpKit.assertQueue('', {exclusive: true}),
            amqpKit.assertExchange(SOCKET_BROADCAST_EXCHANGE, 'fanout', {}),
            amqpKit.assertExchange(SOCKET_DIRECT_EXCHANGE, 'direct', {})
        ]);
    })
    .then((results) => {
        // Run phase
        const broadcastConsumptionQueue = results[0];
        const directConsumptionQueue = results[1];

        console.log("Waiting for messages in %s and %s. To exit press CTRL+C", broadcastConsumptionQueue.queue, directConsumptionQueue.queue);

        // Bind to broadcast exchange
        amqpKit.bindQueue(broadcastConsumptionQueue.queue, SOCKET_BROADCAST_EXCHANGE, '');


        /**
         * On device connect
         */
        function onDeviceConnect(device) {
            amqpKit.bindQueue(directConsumptionQueue.queue, SOCKET_DIRECT_EXCHANGE, device.uuid);
        }

        /**
         * On device disconnect
         */
        function onDeviceDisconnect(device) {
            amqpKit.unbindQueue(directConsumptionQueue.queue, SOCKET_DIRECT_EXCHANGE, device.uuid);
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
        amqpKit.consumeEvent(broadcastConsumptionQueue.queue, 'signa.socket.broadcast.update-channel', (data) => {
            console.log("Received channel update: " + JSON.stringify(data));
        }, {noAck: true});

        amqpKit.consumeEvent(broadcastConsumptionQueue.queue, 'signa.socket.broadcast.new-app-version', (data) => {
            console.log("Received new app version: " + JSON.stringify(data));
        }, {noAck: true});

        amqpKit.consumeEvent(directConsumptionQueue.queue, 'signa.socket.direct.update-device', (data, callback) => {
            console.log("Received update device: " + JSON.stringify(data));
            callback(null, {some: 'device updated kanka, no worries.'});
        });

        amqpKit.consumeEvent(directConsumptionQueue.queue, 'signa.socket.direct.screenshot', (data, callback) => {
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
