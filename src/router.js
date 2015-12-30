'use strict';

const Message = require('./lib/message');


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
     */
    handle(data, done, progress) {
        const message = Message.parse(data);
        const callback = this.callbacks_[message.eventName];

        if (callback)
            callback(message.payload, done, progress)
        else
            console.log('Unhandled message:' + JSON.stringify(data));
    }
}


module.exports = Router;
