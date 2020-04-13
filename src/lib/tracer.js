const config = require('microservice-kit/lib/config');
const TraceAgent = require('@google-cloud/trace-agent');

/**
 * traceOptions = {projectId: string, keyFilename: string}
 */

const traceOptions = config.get('trace');
traceOptions.credentials.private_key = new Buffer(traceOptions.credentials.private_key, 'base64').toString('utf8');

const tracer = TraceAgent.start(traceOptions);

module.exports = tracer;
