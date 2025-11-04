import ExtendableError from './extendableerror.js';

class ClientError extends ExtendableError {
    constructor(message: string, payload?: any) {
        super(message, payload);
    }
}

export default ClientError;

