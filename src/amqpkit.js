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
                        options: item.options,
                        rpc: this.rpc_
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
