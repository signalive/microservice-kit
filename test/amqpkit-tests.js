'use strict';

const _ = require('lodash');
const chai = require('chai');
const sinon = require('sinon');
const sinonChai = require('sinon-chai');
const chaiAsPromised = require('chai-as-promised');
const should = chai.should();
chai.use(sinonChai.default);
chai.use(chaiAsPromised.default);


const amqp = require('amqplib');
const ShutdownKit = require('../src/shutdownkit');
const AMQPKit = require('../src/amqpkit');
const ChannelStubs = require('./lib/channel-stubs');
const ConnectionStubs = require('./lib/connection-stubs');


describe('AMQPKit', function() {
    describe('#init without rpc', function() {
        beforeEach(function() {
            this.options = {
                url: 'localhost',
                rpc: false,
                queues: [
                    {name: 'q1', key: 'q1', options: {durable: true}},
                    {name: 'q2', key: 'q2', options: {durable: true}},
                    {name: 'q3', key: 'q3', options: {durable: true}}
                ],
                exchanges: [
                    {name: 'e1', key: 'e1', type: 'direct'},
                    {name: 'e2', key: 'e2', type: 'direct'},
                    {name: 'e3', key: 'e3', type: 'direct'}
                ]
            };

            this.connectStub = sinon.stub(amqp, 'connect')
                .returns(Promise.resolve(ConnectionStubs.generate()));

            this.shutdownKitStub = sinon.stub(ShutdownKit, 'addJob');
            this.amqpKit = new AMQPKit(this.options);

            sinon.spy(this.amqpKit, 'createQueue');
            sinon.spy(this.amqpKit, 'createExchange');

            return this.amqpKit.init();
        });

        it('connect should be called with url', function() {
            this.connectStub.should.calledWith(this.options.url);
        });

        it('without rpc one channel should be created', function() {
            this.amqpKit.connection.createChannel.calledOnce;
        });

        it('connect should be called once', function() {
            this.connectStub.should.calledOnce;
        });

        it('should add shutdown job', function() {
            this.shutdownKitStub.should.calledOnce;
        });

        it('createQueue should be called 3 times', function() {
            this.amqpKit.createQueue.should.calledThrice;
        });

        it('createExchange should be called 3 times', function() {
            this.amqpKit.createExchange.should.calledThrice;
        });

        afterEach(function() {
            this.connectStub.restore();
            this.shutdownKitStub.restore();
        })
    });
    describe('#init with rpc', function() {
        beforeEach(function() {
            this.options = {
                url: 'localhost',
                rpc: true,
                queues: [
                    {name: 'q1', key: 'q1', options: {durable: true}},
                    {name: 'q2', key: 'q2', options: {durable: true}},
                    {name: 'q3', key: 'q3', options: {durable: true}}
                ],
                exchanges: [
                    {name: 'e1', key: 'e1', type: 'direct'},
                    {name: 'e2', key: 'e2', type: 'direct'},
                    {name: 'e3', key: 'e3', type: 'direct'}
                ]
            };

            this.connectStub = sinon.stub(amqp, 'connect')
                .returns(Promise.resolve(ConnectionStubs.generate()));

            this.shutdownKitStub = sinon.stub(ShutdownKit, 'addJob');

            this.amqpKit = new AMQPKit(this.options);

            sinon.spy(this.amqpKit, 'createQueue');
            sinon.spy(this.amqpKit, 'createExchange');

            return this.amqpKit.init();
        });

        it('connect should be called with url', function() {
            this.connectStub.should.calledWith(this.options.url);
        });

        it('with rpc one channel should be created', function() {
            this.amqpKit.connection.createChannel.calledTwice;
        });

        it('connect should be called once', function() {
            this.connectStub.should.calledOnce;
        });

        it('should add shutdown job', function() {
            this.shutdownKitStub.should.calledOnce;
        });

        it('createQueue should be called 3 times', function() {
            this.amqpKit.createQueue.should.calledThrice;
        });

        it('createExchange should be called 3 times', function() {
            this.amqpKit.createExchange.should.calledThrice;
        });

        afterEach(function() {
            this.connectStub.restore();
            this.shutdownKitStub.restore();
        })
    });

});
