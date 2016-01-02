'use strict';

const async = require('async-q');
const _ = require('lodash');
const amqp = require('amqplib');
const uuid = require('node-uuid');
const debug = require('debug')('microservicekit:amqpkit');

const Message = require('./lib/message');
const Response = require('./lib/response');
const Router = require('./lib/router');
const Queue = require('./lib/queue');
const Exchange = require('./lib/exchange');
const RPC = require('./lib/rpc');
const ShutdownKit = require('./shutdownkit');


class AmqpKit {

    constructor() {
        this.connection = null;
        this.channel = null;
        this.rpc_ = null;
        this.callbacks_ = {};
        this.queues_ = {};
        this.exchanges_ = {};
    }


    /**
     * Connects to rabbitmq, creates channel and creates rpc queue if needed.
     * @param {Object=} opt_options
     *                    url, rpc, queues, exchanges
     * @return {Promise.<this>}
     */
    init(opt_options) {
        this.options_ = _.assign({}, this.defaults, opt_options || {});

        if (this.options_.exchanges && !Array.isArray(this.options_.exchanges))
            throw new Error('MicroserviceKit init failed. ' +
                'options.exchanges must be an array.');

        if (this.options_.queues && !Array.isArray(this.options_.queues))
            throw new Error('MicroserviceKit init failed. ' +
                'options.queues must be an array.');

        return amqp
            .connect(this.options_.url)
            .then((connection) => {
                this.connection = connection;
                var jobs = [
                    connection.createChannel()
                ];

                if (this.options_.rpc) {
                    this.rpc_ = new RPC();
                    jobs.push(this.rpc_.init(connection));
                }

                return Promise.all(jobs);
            })
            .then((channels) => {
                // TODO: Listen and handle connection's and channel's closed, disconnect, error events.
                this.channel = channels[0];
                this.bindEvents();
                return this;
            })
            .then(() => {
                const queues = this.options_.queues || [];
                debug('Asserting ' + queues.length + ' queues');
                return async.mapLimit(queues, 5, (item, index) => {
                    const queue = new Queue({
                        channel: this.channel,
                        name: item.name,
                        options: item.options
                    });

                    return queue.init()
                        .then(() => {
                            this.queues_[item.name] = queue;
                            debug('Asserted queue: ' + queue.name);
                        });
                })
            })
            .then(() => {
                const exchanges = this.options_.exchanges || [];
                debug('Asserting ' + exchanges.length + ' exchanges');
                return async.mapLimit(exchanges, 5, (item, index) => {
                    const exchange = new Exchange({
                        channel: this.channel,
                        name: item.name,
                        type: item.type,
                        options: item.options,
                        rpc: this.rpc_
                    });

                    return exchange.init()
                        .then((exchange) => {
                            this.exchanges_[item.name] = exchange;
                            debug('Asserted exchange: ' + exchange.name);
                        });
                })
            });
    }


    /**
     * Bind rabbitmq's connection events.
     */
    bindEvents() {
        this.connection.on('close', () => {
            debug('connection closed');
        });

        this.connection.on('error', (err) => {
            debug('connection error', err && err.stack ? err.stack : err);
        });

        this.connection.on('blocked', () => {
            debug('connection blocked');
        });

        this.connection.on('unblocked', () => {
            debug('connection blocked');
        });

        ShutdownKit.addJob((done) => {
            debug('Closing connection...');
            this.connection
                .close()
                .then(() => {
                    done();
                })
                .catch(done);
        });
    }


    /**
     * prefetch wrapper function.
     */
    prefetch(count, opt_global) {
        return this.channel.prefetch(count, opt_global);
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
        options.replyTo = this.rpc_.getUniqueQueueName();

        const rv = new Promise((resolve, reject) => {
            this.channel.sendToQueue(queue, content, options);
            this.rpc_.registerCallback(options.correlationId, {resolve, reject});
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
     * Returns queue by key
     * @param {string} queueKey
     */
    getQueue(queueKey) {
        return this.queues_[queueKey];
    }


    /**
     * Returns echange by key
     * @param {string} exchangeKey
     */
    getExchange(exchangeKey) {
        return this.exchanges_[exchangeKey];
    }
}


/**
 * Default options.
 * @type {Object}
 */
AmqpKit.prototype.defaults = {
    alias: 'microservice',
    rpc: true
};



module.exports = AmqpKit;
