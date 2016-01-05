'use strict';

const MicroserviceKit = require('../src');


const microserviceKit = new MicroserviceKit({
    type: 'socket-worker',
    config: null, // Dont use config file!
    amqp: {
        queues: [
            {
                key: 'broadcast',
                options: {exclusive: true}
            },
            {
                key: 'direct',
                options: {exclusive: true}
            }
        ],
        exchanges: [
            {
                name: MicroserviceKit.Enum.Exchange.SOCKET_BROADCAST,
                key: 'socket-broadcast',
                type: 'fanout',
                options: {}
            },
            {
                name: MicroserviceKit.Enum.Exchange.SOCKET_DIRECT,
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
        console.log("Waiting for messages in %s and %s. To exit press CTRL+C", 'broadcast', 'direct');

        const broadcastQueue = microserviceKit.amqpKit.getQueue('broadcast');
        const directQueue = microserviceKit.amqpKit.getQueue('direct');

        // Bind to broadcast exchange
        broadcastQueue.bind(MicroserviceKit.Enum.Exchange.SOCKET_BROADCAST, '');

        /**
         * On device connect
         */
        function onDeviceConnect(device) {
            directQueue.bind(MicroserviceKit.Enum.Exchange.SOCKET_DIRECT, device.uuid);
        }

        /**
         * On device disconnect
         */
        function onDeviceDisconnect(device) {
            directQueue.unbind(MicroserviceKit.Enum.Exchange.SOCKET_DIRECT, device.uuid);
        }

        if (Math.random() >= 0.5) {
            console.log('Connected device: `device-uuid`');
            var device = {uuid: 'device-uuid'};
            onDeviceConnect(device);
        }



        /**
         * Consume socket jobs!
         */
        broadcastQueue.consumeEvent('signa.socket.broadcast.update-channel', (data) => {
            console.log("Received channel update: " + JSON.stringify(data));
        }, {noAck: true});

        broadcastQueue.consumeEvent('signa.socket.broadcast.new-app-version', (data) => {
            console.log("Received new app version: " + JSON.stringify(data));
        }, {noAck: true});

        directQueue.consumeEvent('signa.socket.direct.update-device', (data, callback) => {
            console.log("Received update device: " + JSON.stringify(data));
            callback(null, {some: 'device updated kanka, no worries.'});
        });

        directQueue.consumeEvent('signa.socket.direct.screenshot', (data, callback) => {
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
