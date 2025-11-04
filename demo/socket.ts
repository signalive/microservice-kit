import MicroserviceKit from '../src';

const microserviceKit = new MicroserviceKit({
    type: 'socket-worker',
    amqp: {
        queues: [
            {
                key: 'broadcast',
                options: { exclusive: true }
            },
            {
                key: 'direct',
                options: { exclusive: true }
            }
        ],
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

interface Device {
    uuid: string;
}

microserviceKit
    .init()
    .then(() => {
        console.log("Waiting for messages in %s and %s. To exit press CTRL+C", 'broadcast', 'direct');

        const broadcastQueue = microserviceKit.amqpKit!.getQueue('broadcast')!;
        const directQueue = microserviceKit.amqpKit!.getQueue('direct')!;

        // Bind to broadcast exchange
        broadcastQueue.bind('socket-broadcast', '');

        /**
         * On device connect
         */
        function onDeviceConnect(device: Device) {
            directQueue.bind('socket-direct', device.uuid);
        }

        /**
         * On device disconnect
         */
        function onDeviceDisconnect(device: Device) {
            directQueue.unbind('socket-direct', device.uuid);
        }

        if (Math.random() >= 0.5) {
            console.log('Connected device: `device-uuid`');
            const device = { uuid: 'device-uuid' };
            onDeviceConnect(device);
        }

        /**
         * Consume socket jobs!
         */
        broadcastQueue.consumeEvent('signa.socket.broadcast.update-channel', (data) => {
            console.log("Received channel update: " + JSON.stringify(data));
        }, { noAck: true });

        broadcastQueue.consumeEvent('signa.socket.broadcast.new-app-version', (data) => {
            console.log("Received new app version: " + JSON.stringify(data));
        }, { noAck: true });

        directQueue.consumeEvent('signa.socket.direct.update-device', (data, callback, progress, routingKey) => {
            console.log("Received update device: " + JSON.stringify(data));
            console.log("The routing key of the job was", routingKey);

            callback(null, { some: 'device updated kanka, no worries.' });
        });

        directQueue.consumeEvent('signa.socket.direct.screenshot', (data, callback, progress, routingKey) => {
            console.log("Received update device: " + JSON.stringify(data));
            console.log("The routing key of the job was", routingKey);

            setTimeout(() => {
                const rand = Math.random();
                callback(null, { some: 'screenshot ' + rand });
                console.log("Done screenshot.request " + rand);
            }, 5000);
        });
    })
    .catch((err: Error) => {
        console.log('Cannot boot');
        console.log(err);
    });

