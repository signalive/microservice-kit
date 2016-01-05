'use strict';

const MicroserviceKit = require('../src');
const MicroserviceKitEnum = require('microservice-kit-enums');


const microserviceKit = new MicroserviceKit({
    type: 'some-core-producer-worker',
    config: null, // Dont use config file!
    amqp: {
        queues: [
            {
                name: MicroserviceKitEnum.Queue.CORE,
                key: 'core',
                options: {durable: true}
            }
        ]
    }
});

microserviceKit
    .init()
    .then(() => {
        const coreQueue = microserviceKit.amqpKit.getQueue('core');

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
