'use strict';


class ExtendableError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        this.message = message;
        Error.captureStackTrace(this, this.constructor.name)
    }
}


ExtendableError.prototype.toJSON = function() {
    return {
        message: this.message,
        name: this.name
    }
};


module.exports = ExtendableError;
