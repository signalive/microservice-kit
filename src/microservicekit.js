'use strict';

const _ = require('lodash');
const amqp = require('amqplib');
const uuid = require('node-uuid');

const Message = require('./lib/message');
const Response = require('./lib/response');
const Router = require('./router');


class MicroserviceKit {
    /**
     *
     * @param {Object=} opt_options
     */
    constructor(opt_options) {
        this.options_ = _.assign({}, this.defaults, opt_options || {});
        this.connection = null;
        this.channel = null;
        this.rpcQueue_ = null;
        this.rpcChannel_ = null;
        this.callbacks_ = {};
        this.consumers_ = {};
        this.routers_ = {};
    }


    /**
     * Connects to rabbitmq, creates channel and creates rpc queue if needed.
     * @param {string=} opt_url
     * @return {Promise.<this>}
     */
    init(opt_url) {
        return amqp
            .connect(opt_url)
            .then((connection) => {
                this.connection = connection;
                var jobs = [
                    connection.createChannel()
                ];

                if (this.options_.rpc)
                    jobs.push(connection.createChannel());

                return Promise.all(jobs);
            })
            .then((channels) => {
                // TODO: Listen and handle connection's and channel's closed, disconnect, error events.
                this.channel = channels[0];

                if (this.options_.rpc && channels[1]) {
                    this.rpcChannel_ = channels[1];
                    return this.rpcChannel_.assertQueue('', {exclusive: true});
                }
            })
            .then((queue) => {
                if (queue && queue.queue) {
                    this.rpcQueue_ = queue.queue;
                    this.rpcChannel_.consume(this.rpcQueue_, this.consumeRpc_.bind(this), {noAck: true});
                }

                return this;
            });
    }


    /**
     * Handles messages coming from rpc queue.
     * @param {Object} msg
     */
    consumeRpc_(msg) {
        const correlationId = msg.properties.correlationId;

        if (!this.options_.rpc || !correlationId || !this.callbacks_[correlationId])
            return;

        const callbacks = this.callbacks_[correlationId];

        try {
            const response = Response.parseMessage(msg);

            if (!response.done) {
                callbacks.progress && callbacks.progress(response.payload);
                return;
            }

            if (response.err)
                callbacks.reject(response.err);
            else
                callbacks.resolve(response.payload);

            // TODO: We just accept the first callback recieved.
            delete this.callbacks_[correlationId];
        } catch(err) {
            console.log('Json parse error', err);
        }
    }


    /**
     * assertQueue wrapper function.
     */
    assertQueue(queue, opt_options) {
        return this.channel.assertQueue(queue, opt_options);
    }


    /**
     * assertExchange wrapper function.
     */
    assertExchange(queue, type, opt_options) {
        return this.channel.assertExchange(queue, type, opt_options);
    }


    /**
     * bindQueue wrapper function.
     */
    bindQueue(queue, exchange, pattern) {
        return this.channel.bindQueue(queue, exchange, pattern);
    }


    /**
     * unbindQueue wrapper function.
     */
    unbindQueue(queue, exchange, pattern) {
        return this.channel.bindQueue(queue, exchange, pattern);
    }


    /**
     * Publishes a message on main channel. Its just implements callback (rpc)
     * support and json stringifying data.
     * TODO: Implement timeout.
     * @param {string} exchange
     * @param {string} routingKey
     * @param {Object=} opt_data
     * @param {Object=} opt_options
     * @return {Promise}
     */
    publish(exchange, routingKey, opt_data, opt_options) {
        const options = _.assign({}, this.publishDefaults, opt_options || {});
        const content = new Buffer(JSON.stringify(opt_data || {}));

        if (!this.options_.rpc || options.dontExpectRpc)
            return Promise.resolve(this.channel.publish(exchange, routingKey, content, options));

        options.correlationId = uuid.v4();
        options.replyTo = this.rpcQueue_;

        const rv = new Promise((resolve, reject) => {
            this.channel.publish(exchange, routingKey, content, options);
            this.callbacks_[options.correlationId] = {reject, resolve};
        });

        rv.progress = (callback) => {
            if (this.callbacks_[options.correlationId])
                this.callbacks_[options.correlationId].progress = callback;

            return rv;
        };

        return rv;
    }


    /**
     * Brings eventName support for main publish method above.
     * @param {string} exchange
     * @param {string} routingKey
     * @param {string} eventName
     * @param {Object=} opt_payload
     * @param {Object=} opt_options
     * @return {Promise}
     */
    publishEvent(exchange, routingKey, eventName, opt_payload, opt_options) {
        const message = new Message(eventName, opt_payload);
        return this.publish(exchange, routingKey, message.toJSON(), opt_options);
    }


    /**
     * Sends a message to queue on main channel. Its just implements callback (rpc)
     * support and json stringifying data.
     * TODO: Implement timeout.
     * @param {string} queue
     * @param {Object=} opt_data
     * @param {Object=} opt_options
     * @return {Promise}
     */
    sendToQueue(queue, opt_data, opt_options) {
        const options = _.assign({}, this.publishDefaults, opt_options || {});
        const content = new Buffer(JSON.stringify(opt_data || {}));

        if (!this.options_.rpc || options.dontExpectRpc)
            return Promise.resolve(this.channel.sendToQueue(queue, content, options));

        options.correlationId = uuid.v4();
        options.replyTo = this.rpcQueue_;

        const rv = new Promise((resolve, reject) => {
            this.channel.sendToQueue(queue, content, options);
            this.callbacks_[options.correlationId] = {resolve, reject};
        });

        rv.progress = (callback) => {
            if (this.callbacks_[options.correlationId])
                this.callbacks_[options.correlationId].progress = callback;

            return rv;
        };

        return rv;
    }


    /**
     * Brings eventName support for main publish method above.
     * @param {string} queue
     * @param {string} eventName
     * @param {Object=} opt_payload
     * @param {Object=} opt_options
     * @return {Promise}
     */
    sendEventToQueue(queue, eventName, opt_payload, opt_options) {
        const message = new Message(eventName, opt_payload);
        return this.sendToQueue(queue, message.toJSON(), opt_options);
    }


    /**
     * Consumes all the messages on a queue.
     * @param {string} queue
     * @param {Function} callback
     * @param {Object=} opt_options
     */
    consume(queue, callback, opt_options) {
        const options = _.assign({}, this.consumeDefaults, opt_options || {});
        this.consumers_[queue] = callback;

        return this.channel.consume(queue, (msg) => {
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

                this.consumers_[queue] && this.consumers_[queue](data, done, progress);
            } catch(err) {
                console.log('Error while consuming message:' + msg.content);
                console.log(err.stack);

                if (!options.noAck) {
                    console.log('Negative acknowledging...');
                    this.channel.nack(msg);
                }
            }
        }, options);
    }


    /**
     * Consumes just matched events in queue.
     * @param {string} queue
     * @param {string} eventName
     * @param {Function} callback
     * @param {Object=} opt_options
     */
    consumeEvent(queue, eventName, callback, opt_options) {
        if (!this.consumers_[queue]) {
            const router = new Router();
            this.routers_[queue] = router;
            this.consume(queue, router.handle.bind(router), opt_options);
        }

        this.routers_[queue].register(eventName, callback);
    }
}


/**
 * Default options.
 * @type {Object}
 */
MicroserviceKit.prototype.defaults = {
    alias: 'microservice',
    rpc: true
};


/**
 * Default consume options.
 * @type {Object}
 */
MicroserviceKit.prototype.consumeDefaults = {
    noAck: false
};


/**
 * Default publish & sendToQueue options.
 * @type {Object}
 */
MicroserviceKit.prototype.publishDefaults = {
    dontExpectRpc: false
};


module.exports = MicroserviceKit;
