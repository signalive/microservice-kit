import { describe, test, expect, beforeEach, mock } from 'bun:test';
import Router from '../dist/cjs/lib/router.js';

describe('Router', () => {
    let router: typeof Router.prototype;

    beforeEach(() => {
        router = new Router();
    });

    test('should store handler in memory', () => {
        const handler = function() { };
        router.register('event', handler);
        expect((router as any).callbacks_['event']).toBe(handler);
    });

    test('second register should override handler in memory', () => {
        const handler1 = function() { };
        const handler2 = function() { };
        router.register('event', handler1);
        router.register('event', handler2);
        expect((router as any).callbacks_['event']).not.toBe(handler1);
        expect((router as any).callbacks_['event']).toBe(handler2);
    });

    test('handle method should route events properly', () => {
        const payload = { foo: 'bar' };
        const spy1 = mock(() => {});
        const spy2 = mock(() => {});
        router.register('event1', spy1);
        router.register('event2', spy2);

        const done = function() {};
        const progress = function() {};
        const routingKey = 'routing-key';
        router.handle({ eventName: 'event1', payload: payload }, done, progress, routingKey);
        router.handle({ eventName: 'event2', payload: payload }, done, progress, routingKey);

        expect(spy1).toHaveBeenCalledTimes(1);
        expect(spy1).toHaveBeenCalledWith(payload, done, progress, routingKey);
        expect(spy2).toHaveBeenCalledTimes(1);
        expect(spy2).toHaveBeenCalledWith(payload, done, progress, routingKey);
    });

    test('handle method should route multiple events', () => {
        const payload = { foo: 'bar' };
        const spy = mock(() => {});
        router.register('event', spy);

        for (let i = 0; i < 10; i++) {
            router.handle({ eventName: 'event', payload: payload }, () => {}, () => {});
        }

        expect(spy).toHaveBeenCalledTimes(10);
    });
});

