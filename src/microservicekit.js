'use strict';

const _ = require('lodash');
const fs = require('fs');
const uuid = require('node-uuid');
const debug = require('debug')('microservicekit:microservicekit');

const AmqpKit = require('./amqpkit');
const ShutdownKit = require('./shutdownkit');


class MicroserviceKit {
    constructor(opt_options) {
        this.options_ = _.assign({}, this.defaults, opt_options || {});
        this.config_ = {id: uuid.v4().split('-')[0]};
        this.amqpKit = null;
        this.shutdownKit = ShutdownKit;
    }


    init() {
        return this
            .readConfig()
            .then(() => {
                const amqpOptions = _.assign({}, this.options_.amqp, {id: this.getInstanceName()})
                this.amqpKit = new AmqpKit(amqpOptions);
                return this.amqpKit.init();
            });
    }


    getInstanceName() {
        return this.options_.type + '-' +  this.config_.id;
    }


    readConfig() {
        if (!this.options_.config)
            return Promise.resolve();

        return new Promise((resolve, reject) => {
            fs.readFile(this.options_.config, (err, content) => {
                const createNewConfig = () => {
                    this
                        .writeConfig()
                        .then(resolve)
                        .catch(reject);
                };

                if (err && err.code == 'ENOENT') {
                    // There is no config, create new one.
                    debug('There is no config, creating new one...');
                    return createNewConfig();
                } else if (err) {
                    return reject(err);
                }

                try {
                    const json = JSON.parse(content);
                    this.config_ = json;
                    resolve();
                } catch(err) {
                    debug('Cannot parse config file, creating new one...!', err);
                    createNewConfig();
                }
            })
        });
    }


    writeConfig() {
        return new Promise((resolve, reject) => {
            fs.writeFile(this.options_.config, JSON.stringify(this.config_), (err) => {
                if (err) {
                    debug('Cannot write config file', err);
                    return reject(err);
                }

                resolve();
            })
        });
    }
}


MicroserviceKit.prototype.defaults = {
    type: 'microservice',
    config: './microservice.json',
    amqp: {}
};


module.exports = MicroserviceKit;
