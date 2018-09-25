'use strict';

const _ = require('lodash');
const fs = require('fs');
const EventEmitterExtra = require('event-emitter-extra');
const uuid = require('uuid/v4');
const debug = require('debug')('microservice-kit:microservicekit');
const Chance = require('chance');

const AmqpKit = require('./amqpkit');
const ShutdownKit = require('./shutdownkit');


class MicroserviceKit extends EventEmitterExtra {
    constructor(opt_options) {
        super();

        this.options_ = _.assign({}, this.defaults, opt_options || {});
        this.id = new Chance().first().toLowerCase() + '-' + uuid().split('-')[0];
        this.amqpKit = null;
        this.shutdownKit = ShutdownKit;

    }


    init() {
        if (!this.options_.amqp)
            return Promise.resolve();

        const amqpOptions = _.assign({}, this.options_.amqp, {id: this.getName()});
        this.amqpKit = new AmqpKit(amqpOptions);
        return this.amqpKit.init();
    }


    getName() {
        return this.options_.type + '-' +  this.id;
    }
}


MicroserviceKit.prototype.defaults = {
    type: 'microservice',
    amqp: {}
};


module.exports = MicroserviceKit;
