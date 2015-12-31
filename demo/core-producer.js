'use strict';

const MicroserviceKit = require('../src');


const QUEUE_NAME = 'signa.core';
const amqpKit = new MicroserviceKit.AmqpKit();

amqpKit
    .init()
    .then(() => {
        // Run phase
        // Add message to queue
        amqpKit
            .sendEventToQueue(QUEUE_NAME, 'deneme.job', {some: 'data!'}, {persistent: true})
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
        console.log(err);
    });
