'use strict';

const _ = require('lodash');
const fs = require('fs');
const uuid = require('node-uuid');
const debug = require('debug')('microservicekit:microservicekit');
const Chance = require('chance');
const os = require('os');

const AmqpKit = require('./amqpkit');
const ShutdownKit = require('./shutdownkit');
const DebugKit = require('./debugkit');


class MicroserviceKit {
    constructor(opt_options) {
        this.options_ = _.assign({}, this.defaults, opt_options || {});
        this.id = new Chance().first().toLowerCase() + '-' + uuid.v4().split('-')[0];
        this.hostname = os.hostname();
        this.amqpKit = null;
        this.debugKit = DebugKit;
        this.shutdownKit = ShutdownKit;

        if (_.isFunction(this.options_.shutdown.logger))
            this.shutdownKit.setLogger(this.options_.shutdown.logger);
    }


    init() {
        if (!this.options_.amqp)
            return Promise.resolve();

        const amqpOptions = _.assign({}, this.options_.amqp, {id: this.getName()});
        this.amqpKit = new AmqpKit(amqpOptions);
        return this.amqpKit
            .init()
            .then(() => this.debugKit.init(this, this.options_.debugger));
    }


    getName() {
        return this.options_.type + '-' +  this.id;
    }

    getDetailedInfo() {
        return {
            id: this.id,
            name: this.getName(),
            type: this.options_.type,
            hostname: this.hostname,
            amqpKit: this.amqpKit.getDetailedInfo()
        }
    }

    getBasicInfo() {
        return {
            id: this.id,
            name: this.getName(),
            amqpKit: this.amqpKit.getBasicInfo()
        }
    }
}


MicroserviceKit.prototype.defaults = {
    type: 'microservice',
    amqp: {},
    shutdown: {
        logger: null
    }
};


module.exports = MicroserviceKit;
