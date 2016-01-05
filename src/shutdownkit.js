'use strict';

const debug = require('debug')('microservicekit:shutdownkit');
const _ = require('lodash');
const async = require('async');


class ShutdownKit {
    constructor() {
        // Force resume node process!
        process.stdin.resume();
        this.jobs_ = [];
        this.bindEvents_();
    }


    /**
     * Add a job to graceful shutdown process.
     * @param {Function} job Function of job. Do not forget to call done function!
     */
    addJob(job) {
        this.jobs_.push(job);
    }


    /**
     * Binds common termination signals.
     */
    bindEvents_() {
        process.on('uncaughtException', this.onUncaughtException_.bind(this));
        process.on('SIGTERM', this.onSigTerm_.bind(this));
        process.on('SIGINT', this.onSigInt_.bind(this));
    }


    /**
     * On uncaught exception.
     * @param {Error} err
     */
    onUncaughtException_(err) {
        debug('Uncaught Exception recieved!');
        debug(err.stack);
        this.gracefulShutdown();
    }


    /**
     * On SIGTERM
     */
    onSigTerm_() {
        debug('SIGTERM recieved!');
        this.gracefulShutdown();
    }


    /**
     * On SIGINT
     */
    onSigInt_() {
        debug('SIGINT recieved!');
        this.gracefulShutdown();
    }


    /**
     * Tries to do all the jobs before shutdown.
     */
    gracefulShutdown() {
        // TODO: Add a timeout maybe?
        debug('Trying to shutdown gracefully...');
        async.parallel(this.jobs_, (err) => {
            if (err) {
                debug('Some jobs failed', err);
                debug('Quiting anyway...');
            }
            else
                debug('All jobs done, quiting...');

            this.exit_();
        });
    }


    /**
     * Exists current process.
     */
    exit_() {
        debug("Bye!", new Date());
        process.exit();
    }
}


// Singleton
module.exports = new ShutdownKit();
