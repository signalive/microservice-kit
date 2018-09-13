function createLogger(options = {}) {
    const WinstonPapertrail = require('winston-papertrail').Papertrail;
    return new WinstonPapertrail(options);
}

module.exports = createLogger;
