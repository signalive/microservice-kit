'use strict';

const debug = require('debug')('microservice-kit:shutdownkit');
const _ = require('lodash');
const async = require('async');


class ShutdownKit {
    constructor() {
        // Force resume node process!
        process.stdin.resume();
        this.jobs_ = [];
        this.bindEvents_();
        this.logger_ = null;
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
        this.log_('error', 'Uncaught Exception received!', err);
        this.gracefulShutdown();
    }


    /**
     * On SIGTERM
     */
    onSigTerm_() {
        this.log_('info', 'SIGTERM received!');
        this.gracefulShutdown();
    }


    /**
     * On SIGINT
     */
    onSigInt_() {
        this.log_('info', 'SIGINT received!');
        this.gracefulShutdown();
    }


    /**
     * Tries to do all the jobs before shutdown.
     */
    gracefulShutdown() {
        // TODO: Add a timeout maybe?
        this.log_('info', 'Trying to shutdown gracefully...');
        async.series(this.jobs_.reverse(), (err) => {
            if (err) {
                this.log_('error', 'Some jobs failed', err);
                this.log_('info', 'Quiting anyway...');
            }
            else
                this.log_('info', 'All jobs done, quiting...');

            this.exit_();
        });
    }


    /**
     * Exists current process.
     */
    exit_() {
        this.log_('info', 'Bye!');
        process.exit();
    }


    /**
     * Sets additional logger.
     * @param {Function} logger
     */
    setLogger(logger) {
        if (!_.isFunction(logger))
            return false;

        this.logger_ = logger;
        return true;
    }


    /**
     * Log methods. It uses debug module but also custom logger method if exists.
     */
    log_() {
        debug.apply(null, arguments);

        if (!_.isFunction(this.logger_))
            return;

        this.logger_.apply(null, arguments);
    }
}


// Singleton
if (!global.shutdownKit_)
    global.shutdownKit_ = new ShutdownKit();

module.exports = global.shutdownKit_;
