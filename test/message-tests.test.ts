import { describe, test, expect } from 'bun:test';
import Message from '../dist/cjs/lib/message.js';

describe('Message', () => {
    describe('#parse', () => {
        test('should parse eventName', () => {
            const eventName = 'event1';
            const raw = { eventName, payload: {} };

            const message = Message.parse(raw);
            expect(message.eventName).toBe(eventName);
        });

        test('should parse payload', () => {
            const payload = { foo: 'bar' };
            const raw = { eventName: 'test', payload };

            const message = Message.parse(raw);
            expect(message.payload).toEqual(payload);
        });

        test('should set payload to empty object if not provided', () => {
            const raw = { eventName: 'test', payload: {} };
            const message = Message.parse(raw);
            expect(typeof message.payload).toBe('object');
        });
    });
});

