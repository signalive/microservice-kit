'use strict';

const ExtendableError = require('./extendableerror');


class InternalError extends ExtendableError {
    constructor(m) {
        super(m);
    }
}


module.exports = InternalError;
