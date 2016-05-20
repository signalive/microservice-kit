'use strict';

const debug = require('debug')('microservice-kit:amqpkit:router');
const Message = require('./message');



/**
 * Routes all the messsages incoming from queue by its event name. This routing just works
 * inside a microservice.
 * TODO: Implement unregister and wildcard event handling.
 */
class Router {
    constructor() {
        this.callbacks_ = {};
    }


    /**
     * Registers to given event. You can not register the same event more than once in the same queue.
     * If you do the previous bindings will be forgetten.
     * @param {string} eventName
     * @param {Function} callback
     */
    register(eventName, callback) {
        this.callbacks_[eventName] = callback;
    }


    /**
     * Handles incoming message from queue.
     * @param {Object} data
     * @param {Function} done
     * @param {Function} progress
     * @param {string} routingKey
     */
    handle(data, done, progress, routingKey) {
        debug('Incoming message:' + JSON.stringify(data));

        const message = Message.parse(data);
        const callback = this.callbacks_[message.eventName];

        if (callback)
            callback(message.payload, done, progress, routingKey)
        else
            debug('Unhandled message:' + JSON.stringify(data));
    }
}


module.exports = Router;
