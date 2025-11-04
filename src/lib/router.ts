import debug from 'debug';
import Message from './message.js';
import { EventHandler, RouterCallbackMap } from '../types/index.js';

const debugLog = debug('microservice-kit:amqpkit:router');

/**
 * Routes all the messages incoming from queue by its event name. This routing just works
 * inside a microservice.
 * TODO: Implement unregister and wildcard event handling.
 */
class Router {
    private callbacks_: RouterCallbackMap;

    constructor() {
        this.callbacks_ = {};
    }

    /**
     * Registers to given event. You can not register the same event more than once in the same queue.
     * If you do the previous bindings will be forgotten.
     * @param eventName
     * @param callback
     */
    register(eventName: string, callback: EventHandler): void {
        this.callbacks_[eventName] = callback;
    }

    /**
     * Handles incoming message from queue.
     * @param data
     * @param done
     * @param progress
     * @param routingKey
     */
    handle(data: any, done: (err?: Error | null, data?: any) => void, progress: (data: any) => void, routingKey?: string): void {
        debugLog('Incoming message:' + JSON.stringify(data));

        const message = Message.parse(data);
        const callback = this.callbacks_[message.eventName];

        if (callback) {
            callback(message.payload, done, progress, routingKey);
        } else {
            debugLog('Unhandled message:' + JSON.stringify(data));
        }
    }
}

export default Router;

