'use strict';

require('./error-utils');

module.exports = {
    InternalError: require('./internalerror'),
    ClientError: require('./clienterror')
};
