'use strict';

const sinon = require('sinon');

exports.generate = function(opt_message) {
    const callbacks = {};
    return {
        getUniqueQueueName: sinon.stub().returns('rpc-queue'),
        registerCallback: sinon.spy((id, cb, opts) => {
            callbacks[id] = cb;
            setTimeout(() => callbacks[id].progress && callbacks[id].progress(), 50);
            setTimeout(() => callbacks[id].resolve(), 100);
        }),
        getCallback: sinon.spy((id) => {
            return callbacks[id];
        })
    };
}

