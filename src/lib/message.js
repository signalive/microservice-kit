'use strict';

const _ = require('lodash');


class Message {
    /**
     * This is microservicekit's message entity. This class is wrapper of normal
     * rabbitmq's message content. Implements event names for in-microservice-routing.
     * @param {string} eventName Name of the event.
     * @param {Object=} opt_payload Optional additional dta.
     */
    constructor(eventName, opt_payload) {
        this.eventName = eventName;
        this.payload = _.assign({}, opt_payload || {});
    }


    /**
     * Returns json of object.
     * @return {Object}
     */
    toJSON() {
        return {
            eventName: this.eventName,
            payload: this.payload
        };
    }


    /**
     * Parses rabbitmq's native message object and returns new message.
     * @static
     * @param {Object} msg
     * @return {Message}
     */
    static parseMessage(msg) {
        const rawMessage = JSON.parse(msg.content.toString());
        return Message.parse(rawMessage);
    }


    /**
     * Parses raw (json) object and returns new message.
     * @param {Object} raw
     * @return {Message}
     */
    static parse(raw) {
        return new Message(raw.eventName, raw.payload);
    }
}


module.exports = Message;
