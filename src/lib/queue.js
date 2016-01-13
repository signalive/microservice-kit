"use strict";

const debug = require('debug')('microservicekit:lib:queue');
const async = require('async-q');
const uuid = require('node-uuid');
const _ = require('lodash');
const Message = require('./message');
const Exchange = require('./exchange');
const Response = require('./response');
const Router = require('./router');



class Queue {
    constructor(options) {
        if (!options.channel)
            throw new Error('MicroserviceKit: Queue cannot be ' +
                'constructed without a channel');

        this.channel = options.channel;
        this.name = options.name || '';
        this.rpc_ = options.rpc;
        this.logger_ = options.logger;
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


    consumeRaw_(consumeCallback, options) {
        this.channel.consume(this.getUniqueName(), consumeCallback, options || {});
    }


    /**
     * Consumes all the messages on the queue.
     * @param {Function} callback
     * @param {Object=} opt_options
     */
    consume_(callback, opt_options) {
        const options = _.assign({}, this.consumeDefaults, opt_options || {});
        this.consumer_ = callback;

        return this.channel.consume(this.getUniqueName(), (msg) => {
            try {
                const data = JSON.parse(msg.content.toString());

                const message = Message.parse(data);
                const recievedAt = new Date();

                if (msg.properties.correlationId)
                    this.log_('info', 'Recieved ' + message.eventName + ' event with correlation id ' + msg.properties.correlationId);
                else
                    this.log_('info', 'Recieved ' + message.eventName + ' event without correlation');

                const done = (err, data) => {
                    if (msg.properties.replyTo && msg.properties.correlationId) {
                        const response = new Response(err, data, true);
                        this.channel.sendToQueue(
                            msg.properties.replyTo,
                            new Buffer(JSON.stringify(response.toJSON())),
                            {correlationId: msg.properties.correlationId}
                        );

                        this.log_('info', 'Consumed ' + message.eventName + ' event with correlation id ' +
                            msg.properties.correlationId + ' in ' + (new Date() - recievedAt) + ' ms');
                    } else
                        this.log_('info', 'Consumed ' + message.eventName + ' event without correlation ' +
                            msg.properties.correlationId + ' in ' + (new Date() - recievedAt) + ' ms');

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

                const routingKey = msg.fields.routingKey;

                this.consumer_ && this.consumer_(data, done, progress, routingKey);
            } catch(err) {
                this.log_('error', 'Error while consuming message:' + msg.content, err);

                if (!options.noAck) {
                    this.log_('info', 'Negative acknowledging...');
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
            this.consume_(this.router.handle.bind(this.router), opt_options);
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


    /**
     * Returns real queue name on rabbitmq.
     * @return {string}
     */
    getUniqueName() {
        return this.queue_.queue;
    }


    /**
     * Sends an event to queue on main channel. Its just implements callback (rpc)
     * support.
     * @param {string} eventName
     * @param {Object=} opt_payload
     * @param {Object=} opt_options
     * @return {Promise}
     */
    sendEvent(eventName, opt_payload, opt_options) {
        if (!_.isString(eventName))
            return Promise.reject(new Error('Cannot send event to queue. Event name is required.'));

        const message = new Message(eventName, opt_payload);
        const queue = this.getUniqueName();
        const options = _.assign({}, Exchange.publishDefaults, opt_options || {});
        const content = new Buffer(JSON.stringify(message.toJSON() || {}));

        if (!this.rpc_ || options.dontExpectRpc) {
            this.log_('info', 'Sending ' + eventName + ' event to queue ' + (this.name || this.getUniqueName()) + ' without rpc');
            return Promise.resolve(this.channel.sendToQueue(queue, content, options));
        }

        options.correlationId = uuid.v4();
        options.replyTo = this.rpc_.getUniqueQueueName();

        const rv = new Promise((resolve, reject) => {
            this.log_('info', 'Sending ' + eventName + ' event to queue ' + (this.name || this.getUniqueName()) + ' with correlation id ' + options.correlationId);
            this.channel.sendToQueue(queue, content, options);
            this.rpc_.registerCallback(options.correlationId, {resolve, reject}, options.timeout);
        });

        rv.progress = (callback) => {
            let rpcCb_ = this.rpc_.getCallback(options.correlationId);
            if (rpcCb_)
                rpcCb_.progress = callback;

            return rv;
        };

        return rv;
    }


    /**
     * Log methods. It uses debug module but also custom logger method if exists.
     */
    log_() {
        debug.apply(null, arguments);

        if (!_.isFunction(this.logger_))
            return;

        this.logger_.apply(null, arguments);
    }

    toJSON() {
        return {
            uniqueName: this.getUniqueName(),
            name: this.name,
            options: this.options
        }
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
