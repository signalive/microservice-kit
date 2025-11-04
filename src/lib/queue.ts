import debug from 'debug';
import EventEmitterExtra from './event-emitter-extra/index.js';
import { v4 as uuid } from 'uuid';
import _ from 'lodash';
import Message from './message.js';
import Exchange from './exchange.js';
import Response from './response.js';
import Router from './router.js';
import * as amqp from 'amqplib';
import {
    QueueCreationOptions,
    ConsumeOptions,
    EventHandler,
    PublishOptions,
    Tracer,
    Span
} from '../types/index.js';

const debugLog = debug('microservice-kit:lib:queue');

interface QueueAssertResult {
    queue: string;
}

interface ProgressablePromise<T> extends Promise<T> {
    progress: (callback: (data: any) => void) => ProgressablePromise<T>;
}

class Queue extends EventEmitterExtra {
    public channel: amqp.Channel;
    public name: string;
    public options: amqp.Options.AssertQueue;
    public tracer?: Tracer;
    private rpc_: any; // RPC instance
    private queue_?: QueueAssertResult;
    private consumer_?: (data: any, done: any, progress: any, routingKey?: string) => void;
    public router?: Router;

    constructor(options: QueueCreationOptions) {
        super();
        if (!options.channel) {
            throw new Error('MicroserviceKit: Queue cannot be ' +
                'constructed without a channel');
        }

        this.channel = options.channel;
        this.name = options.name || '';
        this.rpc_ = options.rpc;
        this.options = options.options || {};
        this.tracer = options.tracer;
    }

    /**
     * Init queue
     */
    init(): Promise<this> {
        return this.channel
            .assertQueue(this.name, this.options)
            .then((queue) => {
                this.queue_ = queue;
                return this;
            });
    }

    consumeRaw_(consumeCallback: (msg: amqp.ConsumeMessage | null) => void, options?: ConsumeOptions): Promise<amqp.Replies.Consume> {
        return this.channel.consume(this.getUniqueName(), consumeCallback, options || {});
    }

    /**
     * Consumes all the messages on the queue.
     * @param callback
     * @param opt_options
     */
    private consume_(callback: (data: any, done: any, progress: any, routingKey?: string) => void, opt_options?: ConsumeOptions): Promise<amqp.Replies.Consume> {
        const options = _.assign({}, { noAck: false }, opt_options || {});
        this.consumer_ = callback;

        return this.channel.consume(this.getUniqueName(), (msg) => {
            if (!msg) return;

            try {
                const data = JSON.parse(msg.content.toString());

                const message = Message.parse(data);
                const receivedAt = new Date();

                this.log_('debug', 'Received event', {
                    correlationId: msg.properties.correlationId,
                    eventName: message.eventName
                });

                const done = (err?: Error | null, data?: any) => {
                    const duration = new Date().getTime() - receivedAt.getTime();
                    const logPayload: any = {
                        duration,
                        eventName: message.eventName
                    };

                    if (msg.properties.replyTo && msg.properties.correlationId) {
                        const response = new Response(err, data, true);
                        this.channel.sendToQueue(
                            msg.properties.replyTo,
                            Buffer.from(JSON.stringify(response.toJSON())),
                            { correlationId: msg.properties.correlationId }
                        );

                        logPayload.correlationId = msg.properties.correlationId;
                        logPayload.response = response;
                    }

                    logPayload.labels = {
                        duration,
                        eventName: logPayload.eventName
                    };

                    let logLevel = 'debug';

                    if (err) {
                        logLevel = 'error';
                        logPayload.error = (err as any).toJSON ? (err as any).toJSON() : err;
                    }

                    this.log_(logLevel, 'Consumed event', _.omit(logPayload, 'response'));
                    this.emit('consumedEvent', logPayload);

                    if (!options.noAck) {
                        this.channel.ack(msg);
                    }
                };

                const progress = (data: any) => {
                    if (msg.properties.replyTo && msg.properties.correlationId) {
                        const response = new Response(null, data, false);
                        this.channel.sendToQueue(
                            msg.properties.replyTo,
                            Buffer.from(JSON.stringify(response.toJSON())),
                            { correlationId: msg.properties.correlationId }
                        );
                    }
                };

                const routingKey = msg.fields.routingKey;

                this.consumer_ && this.consumer_(data, done, progress, routingKey);
            } catch (err) {
                this.log_('error', 'Error while consuming message', { err, content: msg.content });

                if (!options.noAck) {
                    this.log_('warn', 'Negative acknowledging...');
                    this.channel.nack(msg);
                }
            }
        }, options);
    }

    /**
     * Consumes just matched events in the queue.
     * @param eventName
     * @param callback
     * @param opt_options
     */
    consumeEvent(eventName: string, callback: EventHandler, opt_options?: ConsumeOptions): void {
        if (!this.consumer_) {
            this.router = new Router();
            this.consume_(this.router.handle.bind(this.router), opt_options);
        }

        this.router!.register(eventName, callback);
    }

    /**
     * Binds this queue to an exchange over a pattern.
     * @param exchange
     * @param pattern
     * @returns {Promise}
     */
    bind(exchange: string, pattern: string): Promise<amqp.Replies.Empty> {
        return this.channel.bindQueue(this.getUniqueName(), exchange, pattern);
    }

    /**
     * Un-binds this queue to an exchange over a pattern.
     * @param exchange
     * @param pattern
     * @returns {Promise}
     */
    unbind(exchange: string, pattern: string): Promise<amqp.Replies.Empty> {
        return this.channel.unbindQueue(this.getUniqueName(), exchange, pattern);
    }

    /**
     * Returns real queue name on rabbitmq.
     * @return {string}
     */
    getUniqueName(): string {
        return this.queue_!.queue;
    }

    /**
     * Sends an event to queue on main channel. Its just implements callback (rpc)
     * support.
     * @param eventName
     * @param opt_payload
     * @param opt_options
     * @return {Promise}
     */
    sendEvent(eventName: string, opt_payload?: any, opt_options?: PublishOptions): ProgressablePromise<any> {
        if (!_.isString(eventName)) {
            return Promise.reject(new Error('Cannot send event to queue. Event name is required.')) as any;
        }

        const message = new Message(eventName, opt_payload);
        const queue = this.getUniqueName();
        const options: PublishOptions = _.assign({}, Exchange.publishDefaults, opt_options || {});
        const content = Buffer.from(JSON.stringify(message.toJSON() || {}));

        if (!this.rpc_ || options.dontExpectRpc) {
            this.log_('debug', 'Sending event to queue', {
                eventName,
                target: this.name || this.getUniqueName()
            });

            return Promise.resolve(this.channel.sendToQueue(queue, content, options)) as any;
        }

        options.correlationId = uuid();
        options.replyTo = this.rpc_.getUniqueQueueName();

        if (_.isNumber(options.timeout) && options.timeout > 0) {
            options.expiration = options.timeout.toString();
        }

        const rv = new Promise((originalResolve, originalReject) => {
            let span: Span | undefined;
            if (this.tracer) {
                span = this.tracer.createChildSpan({ name: `amqpkit-sendEvent:${eventName}` });
                span.addLabel('eventName', eventName);
            }

            this.log_('debug', 'Sending event to queue', {
                eventName,
                correlationId: options.correlationId,
                target: this.name || this.getUniqueName(),
            });

            function resolve(result: any) {
                if (span) {
                    span.addLabel('status', 'successful');
                    span.endSpan();
                }
                originalResolve(result);
            }
            function reject(err: any) {
                if (span) {
                    span.addLabel('status', 'failed');
                    span.endSpan();
                }
                originalReject(err);
            }

            const callbacks = { resolve, reject };
            if (this.tracer) {
                (callbacks as any).resolve = this.tracer.wrap(resolve);
                (callbacks as any).reject = this.tracer.wrap(reject);
            }

            this.channel.sendToQueue(queue, content, options);
            this.rpc_.registerCallback(options.correlationId, callbacks, options.timeout);
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

export default Queue;

