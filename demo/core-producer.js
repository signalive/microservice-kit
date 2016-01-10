'use strict';

const MicroserviceKit = require('../src');
const Errors = require('../src/lib/errors');


const microserviceKit = new MicroserviceKit({
    type: 'some-core-producer-worker',
    config: null, // Dont use config file!
    amqp: {
        queues: [
            {
                name: 'core',
                key: 'core',
                options: {durable: true}
            }
        ],
        logger: function() {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[amqpkit]');
            console.log.apply(console, args);
        }
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
                console.log('Negative response: ', err);
            });
    })
    .catch((err) => {
        console.log('Cannot boot');
        console.log(err.stack);
    });
