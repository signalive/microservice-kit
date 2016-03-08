'use strict';

const ExtendableError = require('./extendableerror');


class InternalError extends ExtendableError {
    constructor(m, p) {
        super(m, p);
    }
}


module.exports = InternalError;
