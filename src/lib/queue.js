"use strict";

const debug = require('debug')('microservicekit:lib:queue');
const async = require('async-q');
const _ = require('lodash');
const Message = require('./message');
const Response = require('./response');
const Router = require('./router');



class Queue {
    constructor(options) {
        if (!options.channel)
            throw new Error('MicroserviceKit: Queue cannot be ' +
                'constructed without a channel');

        this.channel = options.channel;
        this.name = options.name || '';
        this.options = options.options || {};
    }


    /**
     * Init queue
     */
    init() {
        return this.channel
                .assertQueue(this.name, this.options)
                .then((queue) => {
                    this.queue_ = queue;
                    return this;
                });
    }


    consume_(consumeCallback, options) {
        this.channel.consume(this.getUniqueName(), consumeCallback, options || {});
    }


    /**
     * Consumes all the messages on the queue.
     * @param {Function} callback
     * @param {Object=} opt_options
     */
    consume(callback, opt_options) {
        const options = _.assign({}, this.consumeDefaults, opt_options || {});
        this.consumer_ = callback;

        return this.channel.consume(this.getUniqueName(), (msg) => {
            try {
                const data = JSON.parse(msg.content.toString());

                const done = (err, data) => {
                    if (msg.properties.replyTo && msg.properties.correlationId) {
                        const response = new Response(err, data, true);
                        this.channel.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(response.toJSON())),
                            {correlationId: msg.properties.correlationId}
                        );
                    }

                    if (!options.noAck)
                        this.channel.ack(msg);
                };

                const progress = (data) => {
                    if (msg.properties.replyTo && msg.properties.correlationId) {
                        const response = new Response(null, data, false);
                        this.channel.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(response.toJSON())),
                            {correlationId: msg.properties.correlationId}
                        );
                    }
                }

                this.consumer_ && this.consumer_(data, done, progress);
            } catch(err) {
                debug('Error while consuming message:' + msg.content);
                debug(err.stack);

                if (!options.noAck) {
                    debug('Negative acknowledging...');
                    this.channel.nack(msg);
                }
            }
        }, options);
    }


    /**
     * Consumes just matched events in the queue.
     * @param {string} eventName
     * @param {Function} callback
     * @param {Object=} opt_options
     */
    consumeEvent(eventName, callback, opt_options) {
        if (!this.consumer_) {
            this.router = new Router(this.getUniqueName());
            this.consume(this.router.handle.bind(this.router), opt_options);
        }

        this.router.register(eventName, callback);
    }


    /**
     * Binds this queue to an exchange over a pattern.
     * @param {string} exchange
     * @param {string} pattern
     * @returns {Promise}
     */
    bind(exchange, pattern) {
        return this.channel.bindQueue(this.getUniqueName(), exchange, pattern);
    }


    /**
     * Un-binds this queue to an exchange over a pattern.
     * @param {string} exchange
     * @param {string} pattern
     * @returns {Promise}
     */
    unbind(exchange, pattern) {
        return this.channel.unbindQueue(this.getUniqueName(), exchange, pattern);
    }

    getUniqueName() {
        return this.queue_.queue;
    }
}


/**
 * Default consume options.
 * @type {Object}
 */
Queue.prototype.consumeDefaults = {
    noAck: false
};


module.exports = Queue;
