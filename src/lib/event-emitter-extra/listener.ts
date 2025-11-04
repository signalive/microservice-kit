import isString from 'lodash/isString.js';
import isRegExp from 'lodash/isRegExp.js';
import isFunction from 'lodash/isFunction.js';
import isNumber from 'lodash/isNumber.js';

class Listener {
    public eventName?: string;
    public eventNameRegex?: RegExp;
    public handler: (...args: any[]) => any;
    public execCount: number;
    public execLimit: number;
    public onExpire: (listener: Listener) => void;

    constructor(eventName: string | RegExp, handler: (...args: any[]) => any, execLimit: number = 0) {
        if (isString(eventName)) {
            this.eventName = eventName;
        } else if (isRegExp(eventName)) {
            this.eventNameRegex = eventName;
        } else {
            throw new Error('Event name to be listened should be string or regex');
        }

        if (!isFunction(handler)) {
            throw new Error('Handler should be a function');
        }

        if (!isNumber(execLimit) || parseInt(execLimit.toString(), 10) !== execLimit) {
            throw new Error('Execute limit should be integer');
        }

        this.handler = handler;
        this.execCount = 0;
        this.execLimit = execLimit;
        this.onExpire = () => {};
    }

    execute(that: any, args: any[]): any {
        const rv = this.handler.apply(that, args);
        this.execCount++;

        if (this.execLimit && this.execCount >= this.execLimit) {
            this.onExpire(this);
        }

        return rv;
    }

    testRegexWith(eventName: string): boolean {
        const regex = this.eventNameRegex;
        if (!regex) return false;
        return regex.test(eventName);
    }
}

export default Listener;

