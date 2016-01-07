'use strict';

const ExtendableError = require('./extendableerror');


class ClientError extends ExtendableError {
    constructor(m) {
        super(m);
    }
}


module.exports = ClientError;
