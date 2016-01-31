'use strict';

const sinon = require('sinon');
const Message = require('./mocks/message');

exports.generate = function(opt_message) {
    const message = opt_message || Message.mock();
    return {
        assertQueue: sinon.stub().returns(Promise.resolve({
            queue: 'test-queue'
        })),
        assertExchange: sinon.spy((name, type, options) => Promise.resolve({name, type, options})),
        bindQueue: sinon.stub(),
        unbindQueue: sinon.stub(),
        consume: sinon.stub().yields(message),
        sendToQueue: sinon.stub(),
        ack: sinon.stub(),
        nack: sinon.stub(),
        publish: sinon.spy((name, routingKey, content, options) => Promise.resolve())
    };
}

