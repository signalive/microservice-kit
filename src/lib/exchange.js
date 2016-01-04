"use strict";

const debug = require('debug')('microservicekit:lib:exchange');
const async = require('async-q');
const _ = require('lodash');
const uuid = require('node-uuid');
const Message = require('./message');
const Response = require('./response');



class Exchange {
    constructor(options) {
        if (!options.channel)
            throw new Error('MicroserviceKit: Queue cannot be ' +
                'constructed without a channel');

        this.channel = options.channel;
        this.name = options.name || '';
        this.type = options.type || 'direct';
        this.options = options.options || {};
        this.rpc_ = options.rpc;
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
     * Publishes a message on this exchange. Its just implements callback (rpc)
     * support and json stringifying data.
     * TODO: Implement timeout.
     * @param {string} routingKey
     * @param {Object=} opt_data
     * @param {Object=} opt_options
     * @return {Promise}
     */
    publish(routingKey, opt_data, opt_options) {
        const options = _.assign({}, this.publishDefaults, opt_options || {});
        const content = new Buffer(JSON.stringify(opt_data || {}));

        if (!this.rpc_ || options.dontExpectRpc)
            return Promise.resolve(this.channel.publish(this.name, routingKey, content, options));

        options.correlationId = uuid.v4();
        options.replyTo = this.rpc_.getUniqueQueueName();

        const rv = new Promise((resolve, reject) => {
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
     * Brings eventName support for main publish method above.
     * @param {string} routingKey
     * @param {string} eventName
     * @param {Object=} opt_payload
     * @param {Object=} opt_options
     * @return {Promise}
     */
    publishEvent(routingKey, eventName, opt_payload, opt_options) {
        const message = new Message(eventName, opt_payload);
        return this.publish(routingKey, message.toJSON(), opt_options);
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
