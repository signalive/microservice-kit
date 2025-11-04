import * as async from 'async-q';
import _ from 'lodash';
import * as amqp from 'amqplib';
import EventEmitterExtra from './lib/event-emitter-extra/index.js';
import { v4 as uuid } from 'uuid';
import debug from 'debug';
import { parse as parseUrl } from 'url';
import Queue from './lib/queue.js';
import Exchange from './lib/exchange.js';
import RPC from './lib/rpc.js';
import ShutdownKit from './shutdownkit.js';
import { AmqpKitOptions } from './types/index.js';

const debugLog = debug('microservice-kit:amqpkit');

interface QueuesMap {
    [key: string]: Queue;
}

interface ExchangesMap {
    [key: string]: Exchange;
}

class AmqpKit extends EventEmitterExtra {
    public connection: amqp.Connection | null;
    public channel: amqp.Channel | null;
    private options_: AmqpKitOptions;
    private rpc_: RPC | null;
    private queues_: QueuesMap;
    private exchanges_: ExchangesMap;

    /**
     * @param opt_options url, rpc, queues, exchanges
     */
    constructor(opt_options?: AmqpKitOptions) {
        super();
        this.options_ = _.assign({}, this.defaults, opt_options || {});

        this.connection = null;
        this.channel = null;
        this.rpc_ = null;
        this.queues_ = {};
        this.exchanges_ = {};
    }

    /**
     * Connects to rabbitmq, creates channel and creates rpc queue if needed.
     * @return {Promise.<this>}
     */
    init(): Promise<this> {
        if (this.options_.exchanges && !Array.isArray(this.options_.exchanges)) {
            throw new Error('MicroserviceKit init failed. ' +
                'options.exchanges must be an array.');
        }

        if (this.options_.queues && !Array.isArray(this.options_.queues)) {
            throw new Error('MicroserviceKit init failed. ' +
                'options.queues must be an array.');
        }

        if (this.options_.url) {
            this.options_.connectionOptions = _.assign(this.options_.connectionOptions || {}, {
                servername: parseUrl(this.options_.url).hostname
            });
        }

        return amqp
            .connect(this.options_.url || '', this.options_.connectionOptions)
            .then((connection: any) => {
                this.connection = connection;
                const jobs: Promise<any>[] = [
                    connection.createChannel()
                ];

                if (this.options_.rpc) {
                    this.rpc_ = new RPC();
                    this.rpc_.on('log', (...args: any[]) => this.emit('log', ...args));

                    const rpcQueueName = this.options_.id + '-rpc';
                    jobs.push(this.rpc_.init(connection, rpcQueueName));
                }

                return Promise.all(jobs);
            })
            .then((channels: any[]) => {
                this.channel = channels[0] as amqp.Channel;
                this.bindEvents();
                return this;
            })
            .then(() => {
                const queues = this.options_.queues || [];
                debugLog('info', 'Asserting ' + queues.length + ' queues');
                return async.mapLimit(queues, 5, (item: any) => {
                    return this.createQueue(item.key, item.name, item.options);
                });
            })
            .then(() => {
                const exchanges = this.options_.exchanges || [];
                debugLog('info', 'Asserting ' + exchanges.length + ' exchanges');
                return async.mapLimit(exchanges, 5, (item: any) => {
                    return this.createExchange(item.key, item.name, item.type, item.options);
                });
            })
            .then(() => this);
    }

    /**
     * Bind rabbitmq's connection events.
     */
    bindEvents(): void {
        this.connection!.on('close', () => {
            debugLog('error', 'amqp connection closed');
            ShutdownKit.gracefulShutdown();
        });

        this.connection!.on('error', (err: Error) => {
            debugLog('error', 'amqp connection error', err && err.stack ? err.stack : err);
        });

        this.connection!.on('blocked', () => {
            debugLog('error', 'amqp connection blocked');
        });

        this.connection!.on('unblocked', () => {
            debugLog('info', 'amqp connection unblocked');
        });

        ShutdownKit.addJob((done) => {
            debugLog('info', 'Closing amqp connection...');
            try {
                (this.connection as any)
                    .close()
                    .then(() => {
                        done();
                    })
                    .catch(done);
            } catch (err) {
                debugLog('error', 'Could not close connection', err);
                done();
            }
        });
    }

    /**
     * prefetch wrapper function.
     */
    prefetch(count: number, opt_global?: boolean): void {
        this.channel!.prefetch(count, opt_global);
    }

    /**
     * Returns queue by key
     * @param queueKey
     */
    getQueue(queueKey: string): Queue | undefined {
        return this.queues_[queueKey];
    }

    /**
     * Returns exchange by key
     * @param exchangeKey
     */
    getExchange(exchangeKey: string): Exchange | undefined {
        return this.exchanges_[exchangeKey];
    }

    /**
     * Creates a queue.
     * @param key
     * @param name
     * @param opt_options
     * @return {Promise}
     */
    createQueue(key: string, name?: string, opt_options?: amqp.Options.AssertQueue): Promise<Queue> {
        if (!key) {
            return Promise.reject(new Error('You cannot create queue without key.'));
        }

        if (this.queues_[key]) {
            return Promise.reject(new Error('You cannot create queue with same key more than once.'));
        }

        if (!name && opt_options && opt_options.exclusive) {
            name = this.options_.id + '-' + 'excl' + '-' + uuid().split('-')[0];
        }

        const queue = new Queue({
            channel: this.channel!,
            name: name,
            options: opt_options,
            rpc: this.rpc_,
            tracer: this.options_.tracer
        });

        queue.on('log', (...args: any[]) => this.emit('log', ...args));
        queue.on('consumedEvent', (payload: any) => this.emit('consumedEvent', payload));

        return queue.init()
            .then(() => {
                this.queues_[key] = queue;
                debugLog('info', 'Asserted queue: ' + queue.name);
                return queue;
            });
    }

    /**
     * Creates an exchange.
     * @param key
     * @param name
     * @param type
     * @param opt_options
     * @return {Promise}
     */
    createExchange(key: string, name: string, type: 'fanout' | 'direct' | 'topic' | 'headers', opt_options?: amqp.Options.AssertExchange): Promise<Exchange> {
        if (!key) {
            return Promise.reject(new Error('You cannot create exchange without key.'));
        }

        if (this.exchanges_[key]) {
            return Promise.reject(new Error('You cannot create exchange with same key more than once.'));
        }

        const exchange = new Exchange({
            channel: this.channel!,
            name: name,
            type: type,
            options: opt_options,
            rpc: this.rpc_
        });

        exchange.on('log', (...args: any[]) => this.emit('log', ...args));

        return exchange.init()
            .then((exchange) => {
                this.exchanges_[key] = exchange;
                debugLog('info', 'Asserted exchange: ' + exchange.name);
                return exchange;
            });
    }

    get defaults(): AmqpKitOptions {
        return {
            id: 'microservice-default-id',
            rpc: true,
            connectionOptions: {}
        };
    }
}

export default AmqpKit;

