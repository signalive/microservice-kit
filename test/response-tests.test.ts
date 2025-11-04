import { describe, test, expect } from 'bun:test';
import Response from '../dist/cjs/lib/response.js';
import * as ErrorTypes from '../dist/cjs/lib/errors/index.js';

describe('Response', () => {
    describe('#parse', () => {
        test('should parse native error properly', () => {
            const payload = { foo: 'bar' };
            const err = new Error('internal error');
            const done = false;
            const raw = { err: { name: err.name, message: err.message }, payload, done };

            const response = Response.parse(raw);
            expect(response.err).toBeInstanceOf(Error);
            expect(response.err.message).toBe(err.message);
        });

        test('should parse internal error properly', () => {
            const payload = { foo: 'bar' };
            const err = new ErrorTypes.InternalError('internal error');
            const done = false;
            const raw = { err: err.toJSON(), payload, done };

            const response = Response.parse(raw);
            expect(response.err).toBeInstanceOf(ErrorTypes.InternalError);
            expect(response.err.message).toBe(err.message);
        });

        test('should parse client error properly', () => {
            const payload = { foo: 'bar' };
            const err = new ErrorTypes.ClientError('client error');
            const done = false;
            const raw = { err: err.toJSON(), payload, done };

            const response = Response.parse(raw);
            expect(response.err).toBeInstanceOf(ErrorTypes.ClientError);
            expect(response.err.message).toBe(err.message);
        });

        test('should parse done properly', () => {
            const done = false;
            const raw = { done, err: null, payload: null };
            const response = Response.parse(raw);
            expect(response.done).toBe(done);
        });

        test('should parse done as true if not provided', () => {
            const raw = { err: null, payload: null, done: true };
            const response = Response.parse(raw);
            expect(response.done).toBe(true);
        });

        test('should parse payload properly', () => {
            const payload = { foo: 'bar' };
            const raw = { payload, err: null, done: true };
            const response = Response.parse(raw);
            expect(response.payload).toBe(payload);
        });
    });
});

