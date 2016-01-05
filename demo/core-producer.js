'use strict';

const MicroserviceKit = require('../src');


const QUEUE_NAME = 'signa.core';
const microserviceKit = new MicroserviceKit({
    type: 'core-producer',
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
        const coreQueue = microserviceKit.amqpKit.getQueue(QUEUE_NAME);

        coreQueue
            .sendEvent('deneme.job', {some: 'data!'}, {persistent: true})
            .progress((data) => {
                console.log('Progressing...' + JSON.stringify(data));
            })
            .then((response) => {
                console.log('Positive response: ' + JSON.stringify(response));
            })
            .catch((err) => {
                console.log('Negative response: ' + JSON.stringify(err));
            });
    })
    .catch((err) => {
        console.log('Cannot boot');
        console.log(err.stack);
    });
