/**
 * Creates a root logger that can create its own children
 */
function createRootLogger({ providers = [] }) {
    // our current implementation depends on winston as the root logger
    // but we hide this logic from the front-end so it's easier to replace
    const winston = require('winston');

    let transports = providers.reduce((acc, { provider, options = {} }) => {
        try {
            const provideLogger = require(`./providers/${provider}`);
            acc.push(provideLogger(options));
        } catch (err) {
            console.warn(`Failed to load logging provider ${provider} due to`, err);
        }

        return acc;
    }, []);

    if (transports.length < 1) {
        console.warn('No logging providers were loaded, some logs might be lost.');
    }

    return new winston.Logger({
        level: 'silly',
        transports
    });
}

module.exports = createRootLogger;
