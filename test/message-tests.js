'use strict';

const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const Message = require('../src/lib/message');
const ErrorTypes = require('../src/lib/errors');


describe('Message', function() {
    describe('#parse', function() {
        it('should parse eventName', function() {
            const eventName = 'event1';
            const raw = {eventName};

            const message = Message.parse(raw);
            message.eventName.should.equal(eventName);
        })

        it('should parse payload', function() {
            const payload = {foo: 'bar'};
            const raw = {payload};

            const message = Message.parse(raw);
            message.payload.should.deep.equal(payload);
        })

        it('should set payload to empty object if not provided', function() {
            const raw = {};
            const message = Message.parse(raw);
            message.payload.should.be.an('object');
        })
    });
});
