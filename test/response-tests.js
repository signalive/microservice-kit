'use strict';

const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const Response = require('../src/lib/response');
const ErrorTypes = require('../src/lib/errors');


describe('Response', function() {
    describe('#parse', function() {
        it('should parse internal error properly', function() {
            const payload = {foo: 'bar'};
            const err = new ErrorTypes.InternalError('internal error');
            const done = false;
            const raw = {err: err.toJSON(), payload, done};

            const response = Response.parse(raw);
            response.err.should.instanceOf(ErrorTypes.InternalError);
            response.err.message.should.equal(err.message);
        })

        it('should parse client error properly', function() {
            const payload = {foo: 'bar'};
            const err = new ErrorTypes.ClientError('client error');
            const done = false;
            const raw = {err: err.toJSON(), payload, done};

            const response = Response.parse(raw);
            response.err.should.instanceOf(ErrorTypes.ClientError);
            response.err.message.should.equal(err.message);
        })

        it('should parse done properly', function() {
            const done = false;
            const raw = {done};
            const response = Response.parse(raw);
            response.done.should.equal(done);
        })

        it('should parse done as true if not provided', function() {
            const raw = {};
            const response = Response.parse(raw);
            response.done.should.equal(true);
        })

        it('should parse payload properly', function() {
            const payload = {foo: 'bar'};
            const raw = {payload};
            const response = Response.parse(raw);
            response.payload.should.equal(payload);
        })
    });
});
