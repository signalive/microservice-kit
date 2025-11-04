import ExtendableError from './extendableerror.js';

class InternalError extends ExtendableError {
    constructor(message: string, payload?: any) {
        super(message, payload);
    }
}

export default InternalError;

