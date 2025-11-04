import _ from 'lodash';
import * as amqp from 'amqplib';
import * as Errors from './errors/index.js';
import { ResponseJSON } from '../types/index.js';

class Response {
    public err: any;
    public payload: any;
    public done: boolean;

    /**
     * This is microservicekit's response entity. This class is used for RPC protocol.
     * @param opt_err Error object if exists.
     * @param opt_payload Optional additional data.
     * @param opt_done Whether the job is completed or not. By setting this value to false, you can send progress events!
     */
    constructor(opt_err?: Error | null, opt_payload?: any, opt_done?: boolean) {
        this.err = opt_err;
        this.payload = opt_payload;
        this.done = _.isBoolean(opt_done) ? opt_done : true;
    }

    /**
     * Returns json of object.
     * @return {Object}
     */
    toJSON(): ResponseJSON {
        let err = this.err;

        if (_.isObject(err) && err instanceof Error && err.name === 'Error') {
            err = { message: err.message, name: 'Error' };
        }

        return {
            err,
            payload: this.payload,
            done: this.done
        };
    }

    /**
     * Parses rabbitmq's native message object and returns new response.
     * @static
     * @param msg
     * @return {Response}
     */
    static parseMessage(msg: amqp.ConsumeMessage): Response {
        const rawMessage = JSON.parse(msg.content.toString());
        return Response.parse(rawMessage);
    }

    /**
     * Parses raw (json) object and returns new response.
     * @param raw
     * @return {Response}
     */
    static parse(raw: ResponseJSON): Response {
        let err = raw.err;

        if (_.isObject(err) && (err as any).name) {
            switch ((err as any).name) {
                case 'Error':
                    err = new Error((err as any).message);
                    break;
                case 'InternalError':
                    err = new Errors.InternalError((err as any).message, (err as any).payload);
                    break;
                case 'ClientError':
                    err = new Errors.ClientError((err as any).message, (err as any).payload);
                    break;
            }
        }

        return new Response(err, raw.payload, raw.done);
    }
}

export default Response;

