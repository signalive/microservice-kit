const isString = require('lodash/isString');
const isRegExp = require('lodash/isRegExp');
const isFunction = require('lodash/isFunction');
const isNumber = require('lodash/isNumber');


class Listener {
    constructor(eventName, handler, execLimit = 0) {
        if (isString(eventName)) {
            this.eventName = eventName;
        } else if (isRegExp(eventName)) {
            this.eventNameRegex = eventName;
        } else {
            throw new Error('Event name to be listened should be string or regex');
        }

        if (!isFunction(handler))
            throw new Error('Handler should be a function');

        if (!isNumber(execLimit) || parseInt(execLimit, 10) != execLimit)
            throw new Error('Execute limit should be integer');

        this.handler = handler;
        this.execCount = 0;
        this.execLimit = execLimit;
    }


    execute(that, args) {
        const rv = this.handler.apply(that, args);
        this.execCount++;

        if (this.execLimit && this.execCount >= this.execLimit) {
            this.onExpire(this);
        }

        return rv;
    }


    testRegexWith(eventName) {
        const regex = this.eventNameRegex;
        return regex.test(eventName);
    }


    onExpire() {

    }
}


module.exports = Listener;
