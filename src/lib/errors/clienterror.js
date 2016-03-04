'use strict';

const ExtendableError = require('./extendableerror');


class ClientError extends ExtendableError {
    constructor(m, p) {
        super(m, p);
    }
}


module.exports = ClientError;
