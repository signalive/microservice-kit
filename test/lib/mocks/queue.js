'use strict';


exports.mock = function() {
    const message = new Message('test-event', {test: 'payload'});

    return {
        fields: {
            routingKey: ''
        },
        properties: {
            correlationId: '123',
            replyTo: 'abc'
        },
        content: {
            toString: () => JSON.stringify(message.toJSON()),
            toJSON: () => message.toJSON()
        }
    };
}

