'use strict';

const debug = require('debug')('microservicekit:debugkit');
const _ = require('lodash');
const async = require('async');
const ShutdownKit = require('./shutdownkit');


class DebugKit {
    constructor() {
        this.initialized_ = false;
        this.amqpKit = null;

        this.microservices_ = {};

        ShutdownKit.addJob((done) => {
            debug('Stopping DebugKit...');
            clearInterval(this.tickHandler_);
            done();
        });
    }

    init(microserviceKit) {
        this.debug = microserviceKit && microserviceKit.options_.debugger;
        this.microserviceKit = microserviceKit;
        this.amqpKit = this.microserviceKit.amqpKit;

        this.id = this.microserviceKit.id;
        debug(`Initializing debug kit for ${this.id}`);

        return Promise.all([
                this.initHeartbeat(),
                this.initDebug()
            ])
            .then(() => {
                this.tickHandler_ = setInterval(this.tick_.bind(this), 5000);
                this.initialized_ = true;
            });
    }

    initDebug() {
        const requestsExchangeName = 'debug-requests';
        return this.amqpKit
            .createExchange('requests', requestsExchangeName, 'direct')
            .then(exchange => {
                debug('Requests exhange was asserted.');
                this.requestsExchange = exchange;

                return this.amqpKit
                    .createQueue(
                        'debug-requests',
                        `${this.id}-requests`,
                        {exclusive: true}
                    )
                    .then(queue => {
                        debug('Requests queue was asserted.')
                        this.reqeustsQueue = queue;
                        return this.reqeustsQueue
                            .bind(requestsExchangeName, this.id);
                    });
            })
            .then(() => {
                this.reqeustsQueue.consumeEvent('getDetailedInfo', (data, done) => {
                    debug('Responding to getDetailedInfo request...');
                    done(null, this.microserviceKit.getDetailedInfo());
                });
            });
    }

    initHeartbeat() {
        const heartbeatExchangeName = 'debug-heartbeat';
        return this.amqpKit
            .createExchange('heartbeat', heartbeatExchangeName, 'fanout')
            .then((exchange) => {
                debug('Heartbeat exhange was asserted.');
                this.heartbeatExchange = exchange;

                return this.amqpKit
                    .createQueue(
                        'debug-heartbeat',
                        `${this.id}-heartbeat`,
                        {exclusive: true}
                    )
                    .then(queue => {
                        debug('Heartbeat queue was asserted.')
                        this.heartbeatQueue = queue;
                        return this.heartbeatQueue
                            .bind(heartbeatExchangeName, '');
                    });
            })
            .then(() => {
                if (!this.debug) return;

                this.heartbeatQueue.consumeEvent('heartbeat', data => {
                    const createdAt = Date.now();
                    const expiresAt = createdAt + 3000;
                    this.microservices_[data.name] = {data, createdAt, expiresAt};
                });
            });
    }

    tick_() {
        this.deleteExpiredRecords_();

        if (this.lockTicking_)
            return;

        this.lockTicking_ = true;
        this.heartbeatExchange
            .publishEvent('', 'heartbeat', this.microserviceKit.getBasicInfo(), {dontExpectRpc: true})
            .then((response) => {
                this.lockTicking_ = false;
            });
    }

    deleteExpiredRecords_() {
        const now = Date.now();
        this.microservices_ = _.filter(this.microservices_, value => value.expiresAt > now);
    }

    getDiscoveredMicroservices() {
        return _.pluck(_.values(this.microservices_), 'data');
    }

    getMicroserviceInfo(id) {
        return this.requestsExchange.publishEvent(id, 'getDetailedInfo', {});
    }
}


// Singleton
module.exports = new DebugKit();
