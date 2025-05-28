'use strict';

const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const should = chai.should();
chai.use(sinonChai.default);
chai.use(chaiAsPromised.default);

const ErrorTypes = require('../src/lib/errors');
const RPC = require('../src/lib/rpc');
const ConnectionStubs = require('./lib/connection-stubs');
const Message = require('./lib/mocks/message');


describe('RPC', function() {
    beforeEach(function() {
        this.rpc = new RPC();
        sinon.spy(this.rpc, 'init');
        sinon.spy(this.rpc, 'consumer');
        sinon.spy(this.rpc, 'getUniqueQueueName');
        sinon.spy(this.rpc, 'registerCallback');
        sinon.spy(this.rpc, 'getCallback');

        this.ConnectionStub = ConnectionStubs.generate();
    });

    describe('#init', function() {
        it('should call createChannel', function() {
            return this.rpc
                .init(this.ConnectionStub)
                .then(() => {
                    this.ConnectionStub.createChannel.should.calledOnce;
                });
        })

        it('initialized must be true', function() {
            return this.rpc
                .init(this.ConnectionStub)
                .then(() => {
                    chai.expect(this.rpc.initialized).to.equal(true);
                });
        })

        it('channel consume should be called', function() {
            return this.rpc
                .init(this.ConnectionStub)
                .then(() => {
                    this.rpc.channel_.consume.should.calledOnce;
                    chai.expect(this.rpc.queue_).not.to.equal(undefined)
                });
        })
    })

    describe('#consumer', function() {
        beforeEach(function() {
            this.callbacks = {
                resolve: sinon.spy(),
                reject: sinon.spy(),
                progress: sinon.spy()
            };

            return this.rpc
                .init(this.ConnectionStub)
                .then(() => this.rpc.registerCallback('id1', this.callbacks));
        })

        it('should do nothing if there is no correlationId', function() {
            const msg = Message.mock();
            delete msg.properties.correlationId;
            this.rpc.consumer(msg);
            this.callbacks.resolve.should.not.called;
            this.callbacks.reject.should.not.called;
            this.callbacks.progress.should.not.called;
        })

        it('should call resolve if there is a valid correlationId', function() {
            const msg = Message.mock();
            msg.properties.correlationId = 'id1';
            this.rpc.consumer(msg);
            this.callbacks.resolve.should.calledOnce;
        })

        it('should reject if there is an error', function() {
            const msg = Message.mock();
            const errMessage = 'Something wrong';
            const errorObject = new ErrorTypes.InternalError(errMessage);
            msg.properties.correlationId = 'id1';
            msg.content.toString = () => {
                return JSON.stringify({
                    err: errorObject
                })
            };
            this.rpc.consumer(msg);
            this.callbacks.reject.should.have.been.calledWithMatch(sinon.match({message: errMessage, name: 'InternalError'}));
            this.callbacks.resolve.should.not.called;
        })

        it('should call progress, if done is explicitly defined as false', function() {
            const msg = Message.mock();
            msg.properties.correlationId = 'id1';
            msg.content.toString = () => {
                return JSON.stringify({
                    done: false, // !!!!
                    payload: {foo: 'bar'},
                    eventName: 'event-name'
                })
            };
            this.rpc.consumer(msg);
            this.callbacks.progress.should.calledOnce;
        })
    })

    describe('#registerCallback', function() {
        beforeEach(function() {
            return this.rpc.init(this.ConnectionStub);
        })

        it('should store callbacks in memory', function() {
            const callbacks = {
                resolve: sinon.spy(),
                reject: sinon.spy()
            };
            this.rpc.registerCallback('id1', callbacks);
            chai.expect(this.rpc.getCallback('id1')).equal(callbacks);
        });

        it('should remove callbacks after timeout', function(done) {
            const callbacks = {
                resolve: sinon.spy(),
                reject: sinon.spy()
            };
            this.rpc.registerCallback('id1', callbacks, 10);
            setTimeout(() => {
                chai.expect(this.rpc.getCallback('id1')).equal(undefined);
                done();
            }, 20);
        });

        it('should not remove callbacks with negative timeout', function(done) {
            const callbacks = {
                resolve: sinon.spy(),
                reject: sinon.spy()
            };
            this.rpc.registerCallback('id1', callbacks, -10);
            setTimeout(() => {
                chai.expect(this.rpc.getCallback('id1')).equal(callbacks);
                done();
            }, 20);
        });

        it('should reject after timeout', function(done) {
            const callbacks = {
                resolve: sinon.spy(),
                reject: sinon.spy()
            };
            this.rpc.registerCallback('id1', callbacks, 10);
            setTimeout(() => {
                callbacks.reject.should.calledOnce;
                done();
            }, 20);
        });
    })
});
