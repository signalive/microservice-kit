// This demo only works if rabbitmq delayed message plugin is installed and enabled.
// Repository: https://github.com/rabbitmq/rabbitmq-delayed-message-exchange

'use strict';

const MicroserviceKit = require('../src');
const Errors = require('../src/lib/errors');


const microserviceKit = new MicroserviceKit({
    type: 'delayed-consumer',
    config: null, // Dont use config file!
    amqp: {
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
        console.log('Delayed message producer initialized.');

        const exchange = microserviceKit.amqpKit.getExchange('exchange');


        console.log(`Publishing delayed event (delay=5sec) ${new Date()}`);
        exchange
            .publishEvent(
                '',
                'delayed_message',
                {foo: 'bar'},
                {
                    headers: {
                        'x-delay': 5000
                    }
                }
            )
            .then((response) => {
                console.log(`Success ${new Date()}`, response);
            })
            .catch((err) => {
                console.log(`Fail ${new Date()}`, err);
            });
    })
    .catch((err) => {
        console.log('Cannot boot');
        console.log(err.stack);
    });
