import EventEmitterExtra from './event-emitter-extra/index.js';
import debug from 'debug';
import _ from 'lodash';
import Response from './response.js';
import Queue from './queue.js';
import * as amqp from 'amqplib';
import { RPCCallbacks } from '../types/index.js';

const debugLog = debug('microservice-kit:lib:rpc');

interface CallbacksMap {
    [correlationId: string]: RPCCallbacks;
}

interface TimeoutsMap {
    [correlationId: string]: NodeJS.Timeout;
}

interface RegisterDatesMap {
    [correlationId: string]: Date;
}

class RPC extends EventEmitterExtra {
    public initialized: boolean;
    private queue_: Queue | null;
    private channel_: amqp.Channel | null;
    private callbacks_: CallbacksMap;
    private timeouts_: TimeoutsMap;
    private registerDates_: RegisterDatesMap;

    constructor() {
        super();

        this.initialized = false;
        this.queue_ = null;
        this.channel_ = null;
        this.callbacks_ = {};
        this.timeouts_ = {};
        this.registerDates_ = {};
    }

    /**
     * Init rpc manager.
     */
    init(connection: amqp.Connection, opt_queueName?: string): Promise<void> {
        debugLog('Initializing rpc channel.');
        return (connection as any)
            .createChannel()
            .then((channel: amqp.Channel) => {
                debugLog('rpc channel initialized.');

                this.channel_ = channel;
                this.queue_ = new Queue({
                    name: opt_queueName,
                    options: {
                        /* We are effectively creating an ephemeral queue here for RPC.
                         * exclusive: true makes sure queue is deleted when connection is closed.
                         * durable: false makes sure queue is not written to disk. It will be deleted when connection is dropped anyway.
                         * autoDelete: true is here for verbosity. It basically deletes the queue when all connections are dropped.
                         * Check out: https://amqp-node.github.io/amqplib/channel_api.html#channel_assertQueue
                         */
                        exclusive: true,
                        durable: false,
                        autoDelete: true,
                    },
                    channel: this.channel_
                });

                debugLog('Initializing rpc queue.');
                return this.queue_.init();
            })
            .then(() => {
                debugLog('rpc queue initialized.');
                debugLog('Consuming rpc queue...');
                return this.queue_!.consumeRaw_(this.consumer.bind(this), { noAck: true });
            })
            .then(() => {
                debugLog('rpc initialized.');
                this.initialized = true;
            });
    }

    /**
     * Handles messages coming from rpc queue.
     * @param msg
     */
    consumer(msg: amqp.ConsumeMessage | null): void {
        if (!msg) return;
        const correlationId = msg.properties.correlationId;

        if (!this.initialized || !correlationId || !this.callbacks_[correlationId]) {
            return;
        }

        const callbacks = this.callbacks_[correlationId];

        try {
            const response = Response.parseMessage(msg);

            if (!response.done) {
                callbacks.progress && callbacks.progress(response.payload);
                return;
            }

            if (this.registerDates_[correlationId]) {
                const duration = new Date().getTime() - this.registerDates_[correlationId]!.getTime();
                this.log_('debug', 'Got response', { correlationId, duration });
                delete this.registerDates_[correlationId];
            }

            if (response.err) {
                callbacks.reject(response.err);
            } else {
                callbacks.resolve(response.payload);
            }

            if (this.timeouts_[correlationId]) {
                clearTimeout(this.timeouts_[correlationId]!);
                delete this.timeouts_[correlationId];
            }

            delete this.callbacks_[correlationId];
        } catch (err) {
            this.log_('error', 'Cannot consume rpc message, probably json parse error.', { msg, err });
        }
    }

    getUniqueQueueName(): string {
        return this.queue_!.getUniqueName();
    }

    registerCallback(key: string, funcs: RPCCallbacks, opt_timeout?: number): void {
        this.callbacks_[key] = funcs;
        this.registerDates_[key] = new Date();

        if (_.isNumber(opt_timeout) && opt_timeout > 0) {
            this.timeouts_[key] = setTimeout(() => {
                const callbacks = this.callbacks_[key];
                callbacks && callbacks.reject && callbacks.reject(new Error('Timeout exceed.'));
                this.log_('error', 'Timeout exceed', { correlationId: key });
                delete this.callbacks_[key];
                delete this.timeouts_[key];
                delete this.registerDates_[key];
            }, opt_timeout);
        }
    }

    getCallback(key: string): RPCCallbacks | undefined {
        return this.callbacks_[key];
    }

    /**
     * Log methods. It uses debug module but also custom logger method if exists.
     */
    private log_(level: string, ...args: any[]): void {
        debugLog(level, ...args);
        this.emit('log', level, ...args);
    }
}

export default RPC;

