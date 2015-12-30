'use strict';

const MicroserviceKit = require('../src');


const QUEUE_NAME = 'signa.core';
const microserviceKit = new MicroserviceKit();

microserviceKit
    .init()
    .then(() => {
        // Config phase
        return microserviceKit.assertQueue(QUEUE_NAME, {durable: true});
    })
    .then(() => {
        // Run phase
        console.log("Waiting for messages in %s. To exit press CTRL+C", QUEUE_NAME);

        // Consume some core jobs!
        microserviceKit.consumeEvent(QUEUE_NAME, 'deneme.job', (data, callback, progress) => {
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
