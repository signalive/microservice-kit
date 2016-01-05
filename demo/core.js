'use strict';

const MicroserviceKit = require('../src');
const MicroserviceKitEnum = require('microservice-kit-enums');


const microserviceKit = new MicroserviceKit({
    type: 'core-worker',
    config: null, // Dont use config file!
    amqp: {
        queues: [
            {
                name: MicroserviceKit.Enum.Queue.CORE,
                key: 'core',
                options: {durable: true}
            }
        ]
    }
});

microserviceKit
    .init()
    .then(() => {
        // Run phase
        console.log("Waiting for messages in %s. To exit press CTRL+C", 'core');

        const coreQueue = microserviceKit.amqpKit.getQueue('core');

        // Consume some core jobs!
        coreQueue.consumeEvent('deneme.job', (data, callback, progress) => {
            console.log("Received: " + JSON.stringify(data));

            // Dummy progress events
            let count = 0;
            let interval = setInterval(() => {
                progress({data: 'Progress ' + (++count) + '/5'});
            }, 1000);

            // Dummy complete job.
            setTimeout(() => {
                clearInterval(interval);
                // callback({some: 'error.'});
                callback(null, {some: 'Responseee!'});
                console.log('Done.');
            }, 5000);
        });
    })
    .catch((err) => {
        console.log('Cannot boot');
        console.log(err.stack);
    });
