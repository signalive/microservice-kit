'use strict';

const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const Router = require('../src/lib/router');
const Message = require('../src/lib/message');


describe('Router', function() {
   beforeEach(function() {
        this.router = new Router();
        sinon.spy(this.router, 'register');
        sinon.spy(this.router, 'handle');
   });

   it('should store handler in memory', function() {
        const handler = function() { };
        this.router.register('event', handler);
        chai.expect(this.router.callbacks_['event']).to.equal(handler);
   });

   it('second register should override handler in memory', function() {
        const handler1 = function() { };
        const handler2 = function() { };
        this.router.register('event', handler1);
        this.router.register('event', handler2);
        chai.expect(this.router.callbacks_['event']).not.to.equal(handler1);
        chai.expect(this.router.callbacks_['event']).to.equal(handler2);
   });

   it('handle method should route events properly', function() {
        const payload = {foo: 'bar'};
        const spy1 = sinon.spy();
        const spy2 = sinon.spy();
        this.router.register('event1', spy1);
        this.router.register('event2', spy2);

        const done = function() {};
        const progress = function() {};
        const routingKey = 'routing-key';
        this.router.handle({eventName: 'event1', payload: payload}, done, progress, routingKey);
        this.router.handle({eventName: 'event2', payload: payload}, done, progress, routingKey);

        spy1.should.calledOnce;
        spy1.should.calledWith(payload, done, progress, routingKey);
        spy2.should.calledOnce;
        spy2.should.calledWith(payload, done, progress, routingKey);
   });

   it('handle method should route multiple events', function() {
        const payload = {foo: 'bar'};
        const spy = sinon.spy();
        this.router.register('event', spy);

        _.times(10, () => {
            this.router.handle({eventName: 'event', payload: payload});
        })

        spy.should.callCount(10);
        spy.should.calledWith(payload);
   });
});
