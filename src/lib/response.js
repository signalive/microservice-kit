'use strict';

const _ = require('lodash');
const Errors = require('./errors');



class Response {
    /**
     * This is microservicekit's response entitiy. This class is used for RPC protocol.
     * @param {*=} opt_err Error object if exists.
     * @param {Object=} opt_payload Optional additional data.
     * @param {boolean=} opt_done Whether the job is completed or not. By setting this value to false, you can send progress events!
     */
    constructor(opt_err, opt_payload, opt_done) {
        this.err = opt_err;
        this.payload = opt_payload;
        this.done = _.isBoolean(opt_done) ? opt_done : true;
    }


    /**
     * Returns json of object.
     * @return {Object}
     */
    toJSON() {
        let err = this.err;

        if (_.isObject(err) && err instanceof Error && err.name == 'Error')
            err = {message: err.message, name: 'Error'};

        return {
            err,
            payload: this.payload,
            done: this.done
        };
    }


    /**
     * Parses rabbitmq's native message object and returns new response.
     * @static
     * @param {Object} msg
     * @return {Message}
     */
    static parseMessage(msg) {
        const rawMessage = JSON.parse(msg.content.toString());
        return Response.parse(rawMessage);
    }


    /**
     * Parses raw (json) object and returns new response.
     * @param {Object} raw
     * @return {Message}
     */
    static parse(raw) {
        let err = raw.err;

        if (_.isObject(err) && err.name) {
            switch (err.name) {
                case 'Error':
                    err = new Error(err.message);
                    break;
                case 'InternalError':
                    err = new Errors.InternalError(err.message, err.payload);
                    break;
                case 'ClientError':
                    err = new Errors.ClientError(err.message, err.payload);
                    break;
            }
        }

        return new Response(err, raw.payload, raw.done);
    }
}


module.exports = Response;
