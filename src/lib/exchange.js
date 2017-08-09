"use strict";

const debug = require('debug')('microservice-kit:lib:exchange');
const async = require('async-q');
const _ = require('lodash');
const uuid = require('uuid/v4');
const Message = require('./message');
const Response = require('./response');



class Exchange {
    constructor(options) {
        if (!options.channel)
            throw new Error('MicroserviceKit: Queue cannot be ' +
                'constructed without a channel');

        this.channel = options.channel;
        this.name = options.name || '';
        this.key = options.key || this.name;
        this.type = options.type || 'direct';
        this.options = options.options || {};
        this.rpc_ = options.rpc;
        this.logger_ = options.logger;
        this.callbacks_ = {};
    }


    /**
     * Init exhange
     */
    init() {
        return this.channel
                .assertExchange(this.name, this.type, this.options)
                .then((exchange) => {
                    this.exchange_ = exchange;
                    return this;
                });
    }


    /**
     * Publishes an event on this exchange. Its just implements callback (rpc)
     * support
     * @param {string} routingKey
     * @param {string} eventName
     * @param {Object=} opt_payload
     * @param {Object=} opt_options
     * @return {Promise}
     */
    publishEvent(routingKey, eventName, opt_payload, opt_options) {
        if (!_.isString(eventName))
            return Promise.reject(new Error('Cannot publish. Event name is required.'));

        const message = new Message(eventName, opt_payload);
        const options = _.assign({}, this.publishDefaults, opt_options || {});
        const content = new Buffer(JSON.stringify(message.toJSON() || {}));

        if (!this.rpc_ || options.dontExpectRpc) {
            this.log_('info', 'Publishing event', {
                eventName,
                routingKey,
                exchange: this.key
            });

            return Promise.resolve(this.channel.publish(this.name, routingKey, content, options));
        }

        options.correlationId = uuid();
        options.replyTo = this.rpc_.getUniqueQueueName();

        const rv = new Promise((resolve, reject) => {
            this.log_('info', 'Publishing event', {
                eventName,
                routingKey,
                correlationId: options.correlationId,
                exchange: this.key
            });

            this.channel.publish(this.name, routingKey, content, options);
            this.rpc_.registerCallback(options.correlationId, {reject, resolve}, options.timeout);
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
}


/**
 * Default publish & sendToQueue options.
 * @type {Object}
 */
Exchange.prototype.publishDefaults = Exchange.publishDefaults = {
    dontExpectRpc: false,
    timeout: 30 * 1000
};


module.exports = Exchange;
