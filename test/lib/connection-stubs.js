'use strict';

const sinon = require('sinon');
const ChannelStub = require('./channel-stubs');


exports.generate = function(opt_message) {
    return {
        createChannel: sinon.spy(() => Promise.resolve(ChannelStub.generate())),
        on: sinon.spy()
    };
}

