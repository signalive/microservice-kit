'use strict';

const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const should = chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

const Exchange = require('../src/lib/exchange');
const ChannelStubs = require('./lib/channel-stubs');
const RPCStubs = require('./lib/rpc-stubs');



describe('Exchange', function() {
    describe('#init', function() {
        it('exchange should be asserted with proper name and options', function () {
            const channelStub = ChannelStubs.generate();
            const exchangeOptions = {
                channel: channelStub,
                name: 'test-exchange',
                key: 'test',
                type: 'direct',
                options: {}
            };
            const exchange = new Exchange(exchangeOptions);
            return exchange
                .init()
                .then(() => {
                    channelStub.assertExchange.should.calledWith(exchangeOptions.name, exchangeOptions.type, exchangeOptions.options);
                    channelStub.assertExchange.should.calledOnce;
                });
        });

        it('exchange can be asserted without a name', function () {
            const channelStub = ChannelStubs.generate();
            const exchangeOptions = {
                channel: channelStub,
                key: 'test',
                type: 'direct',
                options: {}
            };
            const exchange = new Exchange(exchangeOptions);
            return exchange
                .init()
                .then(() => {
                    exchange.name.should.equal('');
                });
        });


        it('should resolve exchange itself', function () {
            const channelStub = ChannelStubs.generate();
            const exchangeOptions = {
                channel: channelStub
            };
            const exchange = new Exchange(exchangeOptions);
            return exchange
                .init()
                .should.eventually.equal(exchange);
        });

        it('should set key as name if not provided', function () {
            const channelStub = ChannelStubs.generate();
            const exchangeOptions = {
                channel: channelStub,
                name: 'test'
            };
            const exchange = new Exchange(exchangeOptions);
            return exchange
                .init()
                .then(() => {
                    exchange.key.should.equal('test');
                });
        });
    });


    describe('#publishEvent', function() {
        describe('without rpc', function() {
            beforeEach(function() {
                const channelStub = ChannelStubs.generate();
                const exchangeOptions = {
                    channel: channelStub,
                    name: 'test-exchange',
                    options: {}
                };
                this.exchange = new Exchange(exchangeOptions);
                return this.exchange.init()
            })

            it('publishEvent fails without eventName 1', function () {
                return this.exchange.publishEvent().should.eventually.fails;
            });

            it('publishEvent fails without eventName 2', function () {
                return this.exchange.publishEvent('routing-key', null, {foo: 'bar'}).should.eventually.fails;
            });

            it('publishEvent does not fails without routing key', function () {
                return this.exchange.publishEvent(null, 'event', {foo: 'bar'}).should.eventually.fulfilled;
            });
        })

        describe('with rpc', function() {
            beforeEach(function() {
                const channelStub = ChannelStubs.generate();
                const rpcStub = RPCStubs.generate();
                const exchangeOptions = {
                    channel: channelStub,
                    name: 'test-exchange',
                    options: {},
                    rpc: rpcStub
                };
                this.exchange = new Exchange(exchangeOptions);
                return this.exchange.init()
            })

            it('publishEvent fails without eventName 1', function () {
                return this.exchange.publishEvent().should.eventually.fails;
            });

            it('publishEvent fails without eventName 2', function () {
                return this.exchange.publishEvent(null, {foo: 'bar'}).should.eventually.fails;
            });

            it('rpc.getUniqueQueueName() should be called', function () {
                this.exchange.publishEvent(null, 'event', {foo: 'bar'});
                return this.exchange.rpc_.getUniqueQueueName.should.be.calledOnce;
            });

            it('rpc.getUniqueQueueName() should not be called if dontExpectRpc', function () {
                this.exchange.publishEvent(null, 'event', {foo: 'bar'}, {dontExpectRpc: true});
                return this.exchange.rpc_.getUniqueQueueName.should.not.be.called;
            });

            it('publishEvent should resolve after ack', function () {
                const thenSpy = sinon.spy();
                return this.exchange.publishEvent(null, 'event', {foo: 'bar'})
                    .then(thenSpy)
                    .then(() => {
                        thenSpy.should.be.calledOnce;
                    });

            });

            it('progress should be called if provided', function () {
                const progressSpy = sinon.spy();
                return this.exchange.publishEvent(null, 'event', {foo: 'bar'})
                    .progress(progressSpy)
                    .then(() => {
                        this.exchange.rpc_.getCallback.should.be.calledOnce;
                        progressSpy.should.be.calledOnce;
                    });

            });

            it('rpc.registerCallback should be called if provided', function () {
                return this.exchange.publishEvent(null, 'event', {foo: 'bar'})
                    .then(() => {
                        this.exchange.rpc_.registerCallback.should.be.calledOnce;
                    });

            });

            it('progress should be undefined if dontExpectRpc', function () {
                chai.expect(this.exchange.publishEvent(null, 'event', {foo: 'bar'}, {dontExpectRpc: true}).progress).to.be.an('undefined');
            });

            it('rpc.getCallback() should not be called without progress handler', function () {
                return this.exchange.publishEvent(null, 'event', {foo: 'bar'})
                    .then(() => {
                        this.exchange.rpc_.getCallback.should.not.be.called;
                    });
            });

            it('rpc.getCallback() should be called with a progress handler', function () {
                return this.exchange.publishEvent(null, 'event', {foo: 'bar'})
                    .progress(() => {
                        this.exchange.rpc_.getCallback.should.be.called;
                    });
            });
        })
    })


});
