class ExtendableError extends Error {
    public name: string;
    public message: string;
    public payload?: any;

    constructor(message: string, payload?: any) {
        super(message);
        this.name = this.constructor.name;
        this.message = message;
        this.payload = payload;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    toJSON(): { message: string; payload?: any; name: string } {
        return {
            message: this.message,
            payload: this.payload,
            name: this.name
        };
    }
}

export default ExtendableError;

