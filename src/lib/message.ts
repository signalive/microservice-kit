import _ from 'lodash';
import * as amqp from 'amqplib';
import { MessageJSON } from '../types/index.js';

class Message {
    public eventName: string;
    public payload: Record<string, any>;

    /**
     * This is microservicekit's message entity. This class is wrapper of normal
     * rabbitmq's message content. Implements event names for in-microservice-routing.
     * @param eventName Name of the event.
     * @param opt_payload Optional additional data.
     */
    constructor(eventName: string, opt_payload?: Record<string, any>) {
        this.eventName = eventName;
        this.payload = _.assign({}, opt_payload || {});
    }

    /**
     * Returns json of object.
     * @return {Object}
     */
    toJSON(): MessageJSON {
        return {
            eventName: this.eventName,
            payload: this.payload
        };
    }

    /**
     * Parses rabbitmq's native message object and returns new message.
     * @static
     * @param msg
     * @return {Message}
     */
    static parseMessage(msg: amqp.ConsumeMessage): Message {
        const rawMessage = JSON.parse(msg.content.toString());
        return Message.parse(rawMessage);
    }

    /**
     * Parses raw (json) object and returns new message.
     * @param raw
     * @return {Message}
     */
    static parse(raw: MessageJSON): Message {
        return new Message(raw.eventName, raw.payload);
    }
}

export default Message;

