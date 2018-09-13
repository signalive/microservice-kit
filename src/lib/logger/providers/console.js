function createLogger(options = {}) {
    const winston = require('winston');
    return new winston.transports.Console(options);
}

module.exports = createLogger;
