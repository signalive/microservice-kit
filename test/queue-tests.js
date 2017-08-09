'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const Queue = require('../src/lib/queue');
const ChannelStubs = require('./lib/channel-stubs');
const RPCStubs = require('./lib/rpc-stubs');



describe('Queue', function() {
    describe('#init', function() {
        it('queue should be asserted with proper name and options', function () {
            const channelStub = ChannelStubs.generate();
            const queueOptions = {
                channel: channelStub,
                name: 'test-queue',
                options: {
                    exclusive: true
                }
            };
            const queue = new Queue(queueOptions);
            return queue
                .init()
                .then(() => {
                    channelStub.assertQueue.should.calledWith(queueOptions.name, queueOptions.options);
                    channelStub.assertQueue.should.calledOnce;
                });
        });

        it('queue can be asserted without a name', function () {
            const channelStub = ChannelStubs.generate();
            const queueOptions = {
                channel: channelStub,
                options: {
                    exclusive: true
                }
            };
            const queue = new Queue(queueOptions);
            return queue
                .init()
                .then(() => {
                    channelStub.assertQueue.should.calledWith('', queueOptions.options);
                    channelStub.assertQueue.should.calledOnce;
                });
        });

        it('queue can be asserted without options', function () {
            const channelStub = ChannelStubs.generate();
            const queueOptions = {
                channel: channelStub,
                name: 'test-queue'
            };
            const queue = new Queue(queueOptions);
            return queue
                .init()
                .then(() => {
                    channelStub.assertQueue.should.calledWith('test-queue', {});
                    channelStub.assertQueue.should.calledOnce;
                });
        });

        it('init throws error after assertion fails', function () {
            const channelStub = ChannelStubs.generate();
            channelStub.assertQueue = sinon.stub().returns(Promise.reject(new Error('some error')));
            const queueOptions = {
                channel: channelStub,
                name: 'test-queue'
            };
            const queue = new Queue(queueOptions);
            return queue
                .init()
                .should.have.eventually.rejected;
        });


    })



    describe('#consume methods', function() {

        beforeEach(function() {
            const channelStub = ChannelStubs.generate();
            const queueOptions = {
                channel: channelStub,
                name: 'test-queue',
                options: {
                    exclusive: true
                }
            };
            this.queue = new Queue(queueOptions);
            return this.queue.init()
        })

        describe('#consume_', function() {
            it('channel consume should be called with callback and options', function () {
                const callback = sinon.spy();
                const consumeOptions = { noAck: false };
                this.queue.consume_(callback, consumeOptions);
                this.queue.channel.consume.should.calledOnce;
            });
        })

        describe('#consumeRaw_', function() {
            it('channel consume should be called with callback and options', function () {
                const callback = sinon.spy();
                const consumeOptions = { noAck: false };
                this.queue.consumeRaw_(callback, consumeOptions);
                this.queue.channel.consume.should.calledWith('test-queue', callback, consumeOptions);
                this.queue.channel.consume.should.calledOnce;
            });
        })


        describe('#consumeEvent', function() {
            it('channel consume should be when consumeEvent is called at the first place', function () {
                this.queue.consumeEvent('test-event', () => {});
                this.queue.channel.consume.should.called;
            });

            it('channel consume should be called only once and at the first consumeEvent', function () {
                this.queue.consumeEvent('test-event', () => {});
                this.queue.consumeEvent('test-event2', () => {});
                this.queue.channel.consume.should.calledOnce;
            });

            it('router.register should be called', function () {
                // router is undefined before the first consumeEvent
                // therefore, register method can not be spied.
                this.queue.consumeEvent('test-event', () => {});

                sinon.spy(this.queue.router, 'register');
                this.queue.consumeEvent('test-event2', () => {});
                this.queue.router.register.should.calledOnce;
            });
        })

        describe('#bind', function() {
            it('bindQueue should be called', function () {
                this.queue.bind('exchange', 'pattern');
                this.queue.channel.bindQueue.should.calledWith(this.queue.getUniqueName(), 'exchange', 'pattern');
                this.queue.channel.bindQueue.should.calledOnce;
            });
        })

        describe('#unbind', function() {
            it('unbindQueue should be called', function () {
                this.queue.unbind('exchange', 'pattern');
                this.queue.channel.unbindQueue.should.calledWith(this.queue.getUniqueName(), 'exchange', 'pattern');
                this.queue.channel.unbindQueue.should.calledOnce;
            });
        })

        describe('#sendEvent', function() {


            it('sendEvent fails without eventName 2', function () {
                return this.queue.sendEvent(null, {foo: 'bar'}).should.eventually.rejected;
            });
        })
    })

    describe('#sendEvents', function() {
        describe('without rpc', function() {
            beforeEach(function() {
                const channelStub = ChannelStubs.generate();
                const queueOptions = {
                    channel: channelStub,
                    name: 'test-queue',
                    options: {
                        exclusive: true
                    }
                };
                this.queue = new Queue(queueOptions);
                return this.queue.init()
            })

            it('sendEvent fails without eventName 1', function () {
                return this.queue.sendEvent().should.eventually.rejected;
            });

            it('sendEvent fails without eventName 2', function () {
                return this.queue.sendEvent(null, {foo: 'bar'}).should.eventually.rejected;
            });
        })

        describe('with rpc', function() {
            beforeEach(function() {
                const channelStub = ChannelStubs.generate();
                const rpcStub = RPCStubs.generate();
                const queueOptions = {
                    channel: channelStub,
                    name: 'test-queue',
                    options: {
                        exclusive: true
                    },
                    rpc: rpcStub
                };
                this.queue = new Queue(queueOptions);
                return this.queue.init()
            })

            it('sendEvent fails without eventName 1', function () {
                return this.queue.sendEvent().should.eventually.rejected;
            });

            it('sendEvent fails without eventName 2', function () {
                return this.queue.sendEvent(null, {foo: 'bar'}).should.eventually.rejected;
            });

            it('rpc.getUniqueQueueName() should be called', function () {
                this.queue.sendEvent('event', {foo: 'bar'});
                return this.queue.rpc_.getUniqueQueueName.should.be.calledOnce;
            });

            it('rpc.getUniqueQueueName() should not be called if dontExpectRpc', function () {
                this.queue.sendEvent('event', {foo: 'bar'}, {dontExpectRpc: true});
                return this.queue.rpc_.getUniqueQueueName.should.not.be.called;
            });

            it('sendEvent should resolve after ack', function () {
                const thenSpy = sinon.spy();
                return this.queue.sendEvent('event', {foo: 'bar'})
                    .then(thenSpy)
                    .then(() => {
                        thenSpy.should.be.calledOnce;
                    });

            });

            it('progress should be called if provided', function () {
                const progressSpy = sinon.spy();
                return this.queue.sendEvent('event', {foo: 'bar'})
                    .progress(progressSpy)
                    .then(() => {
                        this.queue.rpc_.getCallback.should.be.calledOnce;
                        progressSpy.should.be.calledOnce;
                    });

            });

            it('rpc.registerCallback should be called if provided', function () {
                return this.queue.sendEvent('event', {foo: 'bar'})
                    .then(() => {
                        this.queue.rpc_.registerCallback.should.be.calledOnce;
                    });

            });

            it('progress should be undefined if dontExpectRpc', function () {
                chai.expect(this.queue.sendEvent('event', {foo: 'bar'}, {dontExpectRpc: true}).progress).to.be.an('undefined');
            });

            it('rpc.getCallback() should not be called without progress handler', function () {
                return this.queue.sendEvent('event', {foo: 'bar'})
                    .then(() => {
                        this.queue.rpc_.getCallback.should.not.be.called;
                    });
            });

            it('rpc.getCallback() should be called with a progress handler', function () {
                return this.queue.sendEvent('event', {foo: 'bar'})
                    .progress(() => {
                        this.queue.rpc_.getCallback.should.be.called;
                    });
            });
        })
    })


});
