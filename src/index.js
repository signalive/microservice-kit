'use strict';

module.exports = require('./microservicekit');
module.exports.AmqpKit = require('./amqpkit');
module.exports.ShutdownKit = require('./shutdownkit');
module.exports.ErrorType = require('./lib/errors');
module.exports.createRootLogger = require('./lib/logger');
