import * as amqp from 'amqplib';

// Queue configuration types
export interface QueueConfig {
    key: string;
    name?: string;
    options?: amqp.Options.AssertQueue;
}

// Exchange configuration types
export interface ExchangeConfig {
    key: string;
    name: string;
    type: 'fanout' | 'direct' | 'topic' | 'headers';
    options?: amqp.Options.AssertExchange;
}

// AMQP Kit options
export interface AmqpKitOptions {
    id?: string;
    url?: string;
    rpc?: boolean;
    connectionOptions?: amqp.Options.Connect;
    queues?: QueueConfig[];
    exchanges?: ExchangeConfig[];
    tracer?: Tracer;
}

// Microservice Kit options
export interface MicroserviceKitOptions {
    type?: string;
    amqp?: AmqpKitOptions;
    shutdown?: {
        logger?: LogFunction;
    };
}

// Message types
export interface MessageJSON {
    eventName: string;
    payload: Record<string, any>;
}

// Response types
export interface ResponseJSON {
    err: any;
    payload: any;
    done: boolean;
}

// Event handler types
export type DoneCallback = (err?: Error | null, data?: any) => void;
export type ProgressCallback = (data: any) => void;
export type EventHandler = (
    payload: any,
    done: DoneCallback,
    progress: ProgressCallback,
    routingKey?: string
) => void;

// RPC types
export interface RPCCallbacks {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
    progress?: (data: any) => void;
}

// Publish/Send options
export interface PublishOptions extends amqp.Options.Publish {
    dontExpectRpc?: boolean;
    timeout?: number;
}

// Consume options
export interface ConsumeOptions extends amqp.Options.Consume {
    noAck?: boolean;
}

// Queue options for creation
export interface QueueCreationOptions {
    channel: amqp.Channel;
    name?: string;
    options?: amqp.Options.AssertQueue;
    rpc?: any; // RPC instance
    tracer?: Tracer;
}

// Exchange options for creation
export interface ExchangeCreationOptions {
    channel: amqp.Channel;
    name: string;
    key?: string;
    type: 'fanout' | 'direct' | 'topic' | 'headers';
    options?: amqp.Options.AssertExchange;
    rpc?: any; // RPC instance
}

// Tracer interface (for distributed tracing)
export interface Tracer {
    createChildSpan(options: { name: string }): Span;
    wrap<T extends (...args: any[]) => any>(fn: T): T;
}

export interface Span {
    addLabel(key: string, value: any): void;
    endSpan(): void;
}

// Log function type
export type LogFunction = (...args: any[]) => void;

// Router callback map
export type RouterCallbackMap = {
    [eventName: string]: EventHandler;
};

// Shutdown job
export type ShutdownJob = (done: (err?: Error) => void) => void;

// Event emitter listener types
export type ListenerEventName = string | RegExp | (string | RegExp)[];
export type ListenerHandler = (...args: any[]) => any;

// Consumed event payload for logging
export interface ConsumedEventPayload {
    duration: number;
    eventName: string;
    correlationId?: string;
    error?: any;
    labels: {
        duration: number;
        eventName: string;
    };
}

