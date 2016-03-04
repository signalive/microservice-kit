'use strict';


class ExtendableError extends Error {
    constructor(message, payload) {
        super(message, payload);
        this.name = this.constructor.name;
        this.message = message;
        this.payload = payload;
        Error.captureStackTrace(this, this.constructor.name)
    }
}


ExtendableError.prototype.toJSON = function() {
    return {
        message: this.message,
        payload: this.payload,
        name: this.name
    }
};


module.exports = ExtendableError;
