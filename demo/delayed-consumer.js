// This demo only works if rabbitmq delayed message plugin is installed and enabled.
// Repository: https://github.com/rabbitmq/rabbitmq-delayed-message-exchange

'use strict';

const MicroserviceKit = require('../src');
const Errors = require('../src/lib/errors');


const microserviceKit = new MicroserviceKit({
    type: 'delayed-consumer',
    config: null, // Dont use config file!
    amqp: {
        queues: [
            {
                name: 'queue',
                key: 'queue'
            }
        ],
        exchanges: [
            {
                name: 'delayed-exchange',
                key: 'exchange',
                type: 'x-delayed-message',
                options: {
                    arguments: {
                        'x-delayed-type': 'direct'
                    }
                }
            }
        ],
        logger: function() {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[amqpkit]');
            console.log.apply(console, args);
        }
    },
    shutdown: {
        logger: function() {
            var args = Array.prototype.slice.call(arguments);
            args.unshift('[shutdownkit]');
            console.log.apply(console, args);
        }
    }
});


microserviceKit
    .init()
    .then(() => {
        console.log('Delayed message consumer initialized.');

        const queue = microserviceKit.amqpKit.getQueue('queue');
        queue.bind('delayed-exchange', '');

        queue.consumeEvent('delayed_message', (data, callback, progress, routingKey) => {
            console.log(`delayed_message received ${new Date()}`, data);

            // Dummy progress events
            let count = 0;
            let interval = setInterval(() => {
                progress({data: 'Progress ' + (++count) + '/5'});
            }, 1000);

            // Dummy complete job.
            setTimeout(() => {
                clearInterval(interval);
                callback(new Errors.ClientError('Anaynin amugg'));
                //callback(null, {some: 'Responseee!'});
                console.log(`Done ${new Date()}`);
            }, 5000);
        });
    })
    .catch((err) => {
        console.log('Cannot boot');
        console.log(err.stack);
    });
