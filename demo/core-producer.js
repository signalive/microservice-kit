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
        const coreQueue = amqpKit.getQueue(QUEUE_NAME);

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
