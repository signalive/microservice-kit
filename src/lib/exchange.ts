import debug from 'debug';
import _ from 'lodash';
import EventEmitterExtra from './event-emitter-extra/index.js';
import { v4 as uuid } from 'uuid';
import Message from './message.js';
import * as amqp from 'amqplib';
import { ExchangeCreationOptions, PublishOptions } from '../types/index.js';

const debugLog = debug('microservice-kit:lib:exchange');

interface ProgressablePromise<T> extends Promise<T> {
    progress: (callback: (data: any) => void) => ProgressablePromise<T>;
}

class Exchange extends EventEmitterExtra {
    public static publishDefaults: PublishOptions = {
        dontExpectRpc: false,
        timeout: 30 * 1000,
        persistent: true
    };

    public channel: amqp.Channel;
    public name: string;
    public key: string;
    public type: 'fanout' | 'direct' | 'topic' | 'headers';
    public options: amqp.Options.AssertExchange;
    private rpc_: any; // RPC instance

    constructor(options: ExchangeCreationOptions) {
        super();

        if (!options.channel) {
            throw new Error('MicroserviceKit: Exchange cannot be ' +
                'constructed without a channel');
        }

        this.channel = options.channel;
        this.name = options.name || '';
        this.key = options.key || this.name;
        this.type = options.type || 'direct';
        this.options = options.options || {};
        this.rpc_ = options.rpc;
    }

    /**
     * Init exchange
     */
    init(): Promise<this> {
        return this.channel
            .assertExchange(this.name, this.type, this.options)
            .then(() => {
                return this;
            });
    }

    /**
     * Publishes an event on this exchange. Its just implements callback (rpc)
     * support
     * @param routingKey
     * @param eventName
     * @param opt_payload
     * @param opt_options
     * @return {Promise}
     */
    publishEvent(routingKey: string, eventName: string, opt_payload?: any, opt_options?: PublishOptions): ProgressablePromise<any> {
        if (!_.isString(eventName)) {
            return Promise.reject(new Error('Cannot publish. Event name is required.')) as any;
        }

        const message = new Message(eventName, opt_payload);
        const options: PublishOptions = _.assign({}, Exchange.publishDefaults, opt_options || {});
        const content = Buffer.from(JSON.stringify(message.toJSON() || {}));

        if (!this.rpc_ || options.dontExpectRpc) {
            this.log_('debug', 'Publishing event', {
                eventName,
                routingKey,
                exchange: this.key
            });

            return Promise.resolve(this.channel.publish(this.name, routingKey, content, options)) as any;
        }

        options.correlationId = uuid();
        options.replyTo = this.rpc_.getUniqueQueueName();

        if (_.isNumber(options.timeout) && options.timeout > 0) {
            options.expiration = options.timeout.toString();
        }

        const rv = new Promise((resolve, reject) => {
            this.log_('debug', 'Publishing event', {
                eventName,
                routingKey,
                correlationId: options.correlationId,
                exchange: this.key
            });

            this.channel.publish(this.name, routingKey, content, options);
            this.rpc_.registerCallback(options.correlationId, { reject, resolve }, options.timeout);
        }) as ProgressablePromise<any>;

        (rv as any).progress = (callback: (data: any) => void) => {
            const rpcCb_ = this.rpc_.getCallback(options.correlationId!);
            if (rpcCb_) {
                rpcCb_.progress = callback;
            }

            return rv;
        };

        return rv;
    }

    /**
     * Log methods. It uses debug module but also custom logger method if exists.
     */
    private log_(level: string, ...args: any[]): void {
        debugLog(level, ...args);
        this.emit('log', level, ...args);
    }
}

/**
 * Default publish & sendToQueue options.
 * @type {Object}
 */
(Exchange.prototype as any).publishDefaults = Exchange.publishDefaults;

export default Exchange;

