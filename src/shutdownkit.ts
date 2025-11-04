import EventEmitterExtra from './lib/event-emitter-extra/index.js';
import debug from 'debug';
import async from 'async';
import { ShutdownJob } from './types/index.js';

const debugLog = debug('microservice-kit:shutdownkit');

class ShutdownKit extends EventEmitterExtra {
    public isShuttingDown: boolean;
    private jobs_: ShutdownJob[];

    constructor() {
        super();
        // Force resume node process!
        if (process.stdin.resume) {
            process.stdin.resume();
        }
        this.jobs_ = [];
        this.bindEvents_();
        this.isShuttingDown = false;
    }

    /**
     * Add a job to graceful shutdown process.
     * @param job Function of job. Do not forget to call done function!
     */
    addJob(job: ShutdownJob): void {
        this.jobs_.push(job);
    }

    /**
     * Binds common termination signals.
     */
    private bindEvents_(): void {
        process.on('uncaughtException', this.onUncaughtException_.bind(this));
        process.on('SIGTERM', this.onSigTerm_.bind(this));
        process.on('SIGINT', this.onSigInt_.bind(this));
    }

    /**
     * On uncaught exception.
     * @param err
     */
    private onUncaughtException_(err: Error): void {
        this.log_('error', 'Uncaught Exception received!', err);
        this.gracefulShutdown();
    }

    /**
     * On SIGTERM
     */
    private onSigTerm_(): void {
        this.log_('info', 'SIGTERM received!');
        this.gracefulShutdown();
    }

    /**
     * On SIGINT
     */
    private onSigInt_(): void {
        this.log_('info', 'SIGINT received!');
        this.gracefulShutdown();
    }

    /**
     * Tries to do all the jobs before shutdown.
     */
    gracefulShutdown(): void {
        // TODO: Add a timeout maybe?
        if (this.isShuttingDown) return;
        this.isShuttingDown = true;
        this.log_('info', 'Trying to shutdown gracefully...');
        async.series(this.jobs_.reverse(), (err) => {
            if (err) {
                this.log_('error', 'Some jobs failed', err);
                this.log_('info', 'Quiting anyway...');
            } else {
                this.log_('info', 'All jobs done, quiting...');
            }

            this.exit_();
        });
    }

    /**
     * Exists current process.
     */
    private exit_(): void {
        this.log_('info', 'Bye!');
        process.exit();
    }

    /**
     * Log methods. It uses debug module but also custom logger method if exists.
     */
    private log_(level: string, ...args: any[]): void {
        debugLog(level, ...args);
        this.emit('log', level, ...args);
    }
}

// Singleton
declare global {
    var shutdownKit_: ShutdownKit | undefined;
}

if (!global.shutdownKit_) {
    global.shutdownKit_ = new ShutdownKit();
}

const shutdownKitInstance = global.shutdownKit_!;
export default shutdownKitInstance;

