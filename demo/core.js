'use strict';

const MicroserviceKit = require('../src');


const QUEUE_NAME = 'signa.core';
const microserviceKit = new MicroserviceKit({
    type: 'core',
    config: null, // Dont use config file!
    amqp: {
        queues: [
            {
                name: QUEUE_NAME,
                key: QUEUE_NAME,
                options: {durable: true}
            }
        ]
    }
});

microserviceKit
    .init()
    .then(() => {
        // Run phase
        console.log("Waiting for messages in %s. To exit press CTRL+C", QUEUE_NAME);

        const coreQueue = microserviceKit.amqpKit.getQueue(QUEUE_NAME);

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
