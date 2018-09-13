function createLogger(options = {}) {
    const { LoggingWinston } = require('@google-cloud/logging-winston');
    return new LoggingWinston(options);
}

module.exports = createLogger;
