'use strict';

const MicroserviceKit = require('../src');


const QUEUE_NAME = 'signa.core';
const amqpKit = new MicroserviceKit.AmqpKit();

amqpKit
    .init({
        // url: 'amqp://arzcmdsz:jcN7Ft4AXKkMvcisYDEKu4fbqK-brTjH@hare.rmq.cloudamqp.com/arzcmdsz',
        alias: 'Core0',
        queues: [
            {
                name: QUEUE_NAME,
                options: {durable: true}
            }
        ]
    })
    .then(() => {
        // Run phase
        console.log("Waiting for messages in %s. To exit press CTRL+C", QUEUE_NAME);

        const coreQueue = amqpKit.getQueue(QUEUE_NAME);

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
