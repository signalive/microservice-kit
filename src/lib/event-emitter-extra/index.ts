import isArray from 'lodash/isArray.js';
import isFunction from 'lodash/isFunction.js';
import isNumber from 'lodash/isNumber.js';
import isRegExp from 'lodash/isRegExp.js';
import isString from 'lodash/isString.js';
import Listener from './listener.js';

type EventName = string | RegExp | (string | RegExp)[];
type Handler = (...args: any[]) => any;

interface EventListenersMap {
    [eventName: string]: Listener[];
}

class EventEmitterExtra {
    public static defaultMaxListeners = 10;
    public static defaultMaxRegexListeners = 10;
    public static Listener = Listener;

    private maxListeners_: number;
    private maxRegexListeners_: number;
    private listeners_: Listener[];
    private regexListeners_: Listener[];
    private eventListeners_: EventListenersMap;

    constructor() {
        this.maxListeners_ = EventEmitterExtra.defaultMaxListeners;
        this.maxRegexListeners_ = EventEmitterExtra.defaultMaxRegexListeners;
        this.listeners_ = [];
        this.regexListeners_ = [];
        this.eventListeners_ = {};
    }

    addListener(eventName: EventName, handler: Handler | Handler[], opt_execLimit?: number, opt_prepend?: boolean): this {
        if (isArray(eventName) || isArray(handler)) {
            const events = isArray(eventName) ? eventName : [eventName];
            const handlers = isArray(handler) ? handler : [handler];
            events.forEach(event => {
                handlers.forEach(h => {
                    this.addListener(event, h, opt_execLimit);
                });
            });
            return this;
        }

        const listener = new Listener(eventName as string | RegExp, handler as Handler, opt_execLimit);

        if (listener.eventName) {
            if (!this.eventListeners_[listener.eventName]) {
                this.eventListeners_[listener.eventName] = [];
            }

            if (this.eventListeners_[listener.eventName]!.length >= this.maxListeners_) {
                throw new Error(`Max listener count reached for event: ${eventName}`);
            }

            this.emit('newListener', eventName, handler);

            if (opt_prepend) {
                this.eventListeners_[listener.eventName]!.unshift(listener);
            } else {
                this.eventListeners_[listener.eventName]!.push(listener);
            }
        } else if (listener.eventNameRegex) {
            if (this.regexListeners_.length >= this.maxRegexListeners_) {
                throw new Error(`Max regex listener count reached`);
            }

            this.emit('newListener', eventName, handler);

            if (opt_prepend) {
                this.regexListeners_.unshift(listener);
            } else {
                this.regexListeners_.push(listener);
            }
        }

        listener.onExpire = this.removeListener_.bind(this);
        this.listeners_.push(listener);

        return this;
    }

    prependListener(eventName: EventName, handler: Handler, opt_execLimit?: number): this {
        return this.addListener(eventName, handler, opt_execLimit, true);
    }

    prependOnceListener(eventName: EventName, handler: Handler): this {
        return this.addListener(eventName, handler, 1, true);
    }

    prependManyListener(eventName: EventName, count: number, handler: Handler): this {
        return this.addListener(eventName, handler, count, true);
    }

    private removeListener_(listener: Listener): void {
        remove(this.listeners_, listener);

        if (listener.eventName && isArray(this.eventListeners_[listener.eventName])) {
            remove(this.eventListeners_[listener.eventName]!, listener);

            if (this.eventListeners_[listener.eventName]!.length === 0) {
                delete this.eventListeners_[listener.eventName];
            }
        } else if (listener.eventNameRegex) {
            remove(this.regexListeners_, listener);
        }

        this.emit('removeListener', listener.eventName || listener.eventNameRegex, listener.handler);
    }

    removeAllListeners(eventName?: EventName): this {
        if (isArray(eventName)) {
            eventName.forEach(event => this.removeAllListeners(event));
        } else if (isString(eventName) && isArray(this.eventListeners_[eventName])) {
            const listeners = this.eventListeners_[eventName]!.slice();
            listeners.forEach(listener => {
                this.removeListener_(listener);
            });
        } else if (isRegExp(eventName)) {
            const regex = eventName;
            const listeners = this.regexListeners_.filter(listener => regexEquals(listener.eventNameRegex, regex));
            listeners.forEach(listener => this.removeListener_(listener));
        } else if (eventName === undefined) {
            this.removeAllListeners(this.eventNames());
            this.removeAllListeners(this.regexes());
        }

        return this;
    }

    removeListener(eventName: EventName, handler: Handler | Handler[]): this {
        if (isArray(eventName) || isArray(handler)) {
            const events = isArray(eventName) ? eventName : [eventName];
            const handlers = isArray(handler) ? handler : [handler];
            events.forEach(event => {
                handlers.forEach(h => {
                    this.removeListener(event, h);
                });
            });
        } else if (isString(eventName) && isArray(this.eventListeners_[eventName])) {
            const listeners = this.eventListeners_[eventName]!.filter(listener => listener.handler === handler);
            listeners.forEach(listener => this.removeListener_(listener));
        } else if (isRegExp(eventName)) {
            const regex = eventName;
            const listeners = this.regexListeners_.filter(
                listener =>
                    regexEquals(listener.eventNameRegex, regex) &&
                    listener.handler === handler
            );
            listeners.forEach(listener => this.removeListener_(listener));
        } else {
            throw new Error('Event name should be string or regex.');
        }

        return this;
    }

    eventNames(): string[] {
        return Object.keys(this.eventListeners_);
    }

    regexes(): RegExp[] {
        return this.regexListeners_.map(listener => listener.eventNameRegex!);
    }

    getMaxListeners(): number {
        return this.maxListeners_;
    }

    setMaxListeners(n: number): this {
        if (!isNumber(n) || parseInt(n.toString(), 10) !== n) {
            throw new Error('n must be integer');
        }

        this.maxListeners_ = n;
        return this;
    }

    getMaxRegexListeners(): number {
        return this.maxRegexListeners_;
    }

    setMaxRegexListeners(n: number): this {
        if (!isNumber(n) || parseInt(n.toString(), 10) !== n) {
            throw new Error('n must be integer');
        }

        this.maxRegexListeners_ = n;
        return this;
    }

    listenerCount(eventName: string | RegExp): number {
        if (isString(eventName)) {
            if (!this.eventListeners_[eventName]) {
                return 0;
            }

            return this.eventListeners_[eventName]!.length;
        } else if (isRegExp(eventName)) {
            return this.regexListeners_
                .filter(listener => regexEquals(eventName, listener.eventNameRegex))
                .length;
        } else {
            throw new Error('Event name should be string or regex.');
        }
    }

    listeners(eventName: string | RegExp): Handler[] {
        if (isString(eventName)) {
            if (!this.eventListeners_[eventName]) {
                return [];
            }

            return this.eventListeners_[eventName]!.map(listener => listener.handler);
        } else if (isRegExp(eventName)) {
            return this.regexListeners_
                .filter(listener => regexEquals(eventName, listener.eventNameRegex))
                .map(listener => listener.handler);
        } else {
            throw new Error('Event name should be string or regex.');
        }
    }

    on(eventName: EventName, handler: Handler): this {
        return this.addListener(eventName, handler);
    }

    once(eventName: EventName, handler: Handler): this {
        return this.addListener(eventName, handler, 1);
    }

    many(eventName: EventName, count: number, handler: Handler): this {
        return this.addListener(eventName, handler, count);
    }

    emit(eventName: EventName | string[], ...args: any[]): any[] | false {
        if (isArray(eventName)) {
            let rv: any[] = [];
            eventName.forEach(event => {
                const results = this.emit(event, ...args);
                rv = rv.concat(results);
            });
            return rv;
        } else if (!isString(eventName)) {
            throw new Error('Event name should be string');
        }

        let results: any[] = [];
        const event = { name: eventName };

        if (this.eventListeners_[eventName]) {
            const nameMatchedResults = this.eventListeners_[eventName]!
                .slice() // Shallow copy for not to skip if listener is expired
                .map(listener => listener.execute(
                    Object.assign({}, listener, { event }),
                    args
                ));
            results = results.concat(nameMatchedResults);
        }

        const regexMatchedResults = this.regexListeners_
            .filter(listener => listener.testRegexWith(eventName))
            .map(listener => listener.execute(
                Object.assign({}, listener, { event }),
                args
            ));

        results = results.concat(regexMatchedResults);

        return results.length > 0 ? results : false;
    }

    emitAsync(eventName: EventName | string[], ...args: any[]): Promise<void> {
        const rv = this.emit(eventName, ...args);

        if (!rv) {
            return Promise.resolve();
        }

        return Promise.all(rv).then(() => undefined);
    }
}

function regexEquals(a: any, b: any): boolean {
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    return a.toString() === b.toString();
}

function remove<T>(arr: T[], predicate: T | ((item: T) => boolean)): T[] {
    let removedItems: T[] = [];

    if (isFunction(predicate)) {
        removedItems = arr.filter(predicate as (item: T) => boolean);
    } else if (arr.indexOf(predicate as T) > -1) {
        removedItems.push(predicate as T);
    }

    removedItems.forEach(item => {
        const index = arr.indexOf(item);
        arr.splice(index, 1);
    });

    return removedItems;
}

export default EventEmitterExtra;

