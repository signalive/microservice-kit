"use strict";

const debug = require('debug')('microservicekit:lib:rpc');
const uuid = require('node-uuid');
const Response = require('./response');
const Queue = require('./queue');



class RPC {
    constructor() {
        this.initialized = false;
        this.queue_ = null;
        this.channel_ = null;
        this.callbacks_ = {};
    }


    /**
     * Init rpc manager.
     */
    init(connection) {
        debug('Initializing rpc channel.');
        return connection
                .createChannel()
                .then((channel) => {
                    debug('rpc channel initialized.');

                    this.channel_ = channel;
                    this.queue_ = new Queue({
                        options: {exclusive: true},
                        channel: this.channel_
                    });

                    debug('Initializing rpc queue.');
                    return this.queue_.init();
                })
                .then(() => {
                    debug('rpc queue initialized.');
                    debug('Consuming rpc queue...');
                    return this.queue_
                            .consume_(this.consumer.bind(this), {noAck: true});
                })
                .then(() => {
                    debug('rpc initialized.');
                    this.initialized = true;
                });
    }



    /**
     * Handles messages coming from rpc queue.
     * @param {Object} msg
     */
    consumer(msg) {
        const correlationId = msg.properties.correlationId;

        if (!this.initialized || !correlationId || !this.callbacks_[correlationId])
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

            delete this.callbacks_[correlationId];
        } catch(err) {
            debug('Cannot consume rpc message, probably json parse error.');
            debug('Message:', msg);
            debug('Error:', err);
        }
    }

    getUniqueQueueName() {
        return this.queue_.getUniqueName();
    }

    registerCallback(key, funcs) {
        this.callbacks_[key] = funcs;
    }

    getCallback(key) {
        return this.callbacks_[key];
    }
}



module.exports = RPC;
