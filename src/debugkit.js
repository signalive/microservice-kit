'use strict';

const debug = require('debug')('microservicekit:debugkit');
const _ = require('lodash');
const async = require('async');


class DebugKit {
    constructor() {
        this.initialized_ = false;
        this.amqpKit = null;

        this.microservices_ = {};
    }

    init(microserviceKit) {
        this.debug = microserviceKit && microserviceKit.options_.debugger;
        this.microserviceKit = microserviceKit;
        this.amqpKit = this.microserviceKit.amqpKit;
        const id = this.microserviceKit.id;

        debug(`Initializing debug kit for ${this.microserviceKit.getName()}`);

        return this.amqpKit
            .createExchange('debug', 'microservice-debug', 'fanout')
            .then((exchange) => {
                debug('Exhange was asserted.');
                this.exchange = exchange;
            })
            .then(() => {
                if (!this.debug)
                    return Promise.resolve();

                return this.amqpKit
                    .createQueue(
                        'debug',
                        `microservice-${id}-debug`,
                        {exclusive: true}
                    )
                    .then(queue => {
                        debug('Exclusive queue was asserted.')
                        this.queue = queue;
                        return this.queue
                            .bind('microservice-debug', '')
                            .then(() => this.bindEvents_())
                    });
            })
            .then(() => {
                this.tickHandler_ = setInterval(this.tick_.bind(this), 1000);
                this.initialized_ = true;
            });
    }

    bindEvents_() {
        if (this.debug) {
            debug('Binding master events...');
            this.queue.consumeEvent('microservice:heartbeat', data => {
                const createdAt = Date.now();
                const expiresAt = createdAt + 3000;
                this.microservices_[data.name] = {data, createdAt, expiresAt};
            });
        } else {
            debug('Binding slave events...');
        }
    }

    tick_() {
        this.deleteExpiredRecords_();

        if (this.lockTicking_)
            return;

        this.lockTicking_ = true;
        this.exchange.publishEvent(
                '',
                'microservice:heartbeat',
                this.microserviceKit.toJSON(),
                {dontExpectRpc: true}
            )
        .then((response) => {
            this.lockTicking_ = false;
        });
    }

    deleteExpiredRecords_() {
        const now = Date.now();
        this.microservices_ = _.filter(this.microservices_, value => value.expiresAt > now);
    }

    getMicroservices() {
        return _.pluck(_.values(this.microservices_), 'data');
    }
}


// Singleton
module.exports = new DebugKit();
