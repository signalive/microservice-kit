'use strict';

const _ = require('lodash');
const fs = require('fs');
const EventEmitterExtra = require('./lib/event-emitter-extra');
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

        this.shutdownKit.on('log', (...args) => {
            this.emit('shutdownKitLog', ...args);
            args.splice(1, 0, '[shutdownkit]');
            this.emit('log', ...args);
        });
    }


    init() {
        if (!this.options_.amqp)
            return Promise.resolve();

        const amqpOptions = _.assign({}, this.options_.amqp, {id: this.getName()});
        this.amqpKit = new AmqpKit(amqpOptions);

        this.amqpKit.on('log', (...args) => {
            this.emit('amqpKitLog', ...args);
            args.splice(1, 0, '[amqpkit]');
            this.emit('log', ...args);
        });

        this.amqpKit.on('consumedEvent', payload => this.emit('consumedEvent', payload));

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
