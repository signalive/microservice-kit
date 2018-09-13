function createLogger(options = {}) {
    const WinstonElasticsearch = require('winston-elasticsearch');
    return new WinstonElasticsearch(options);
}

module.exports = createLogger;
