function createLogger(options = {}) {
    const winston = require('winston');
    return new winston.transports.File(options);
}

module.exports = createLogger;
