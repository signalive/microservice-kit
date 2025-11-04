import _ from 'lodash';
import EventEmitterExtra from './lib/event-emitter-extra/index.js';
import { v4 as uuid } from 'uuid';
import Chance from 'chance';
import AmqpKit from './amqpkit.js';
import ShutdownKit from './shutdownkit.js';
import { MicroserviceKitOptions } from './types/index.js';

class MicroserviceKit extends EventEmitterExtra {
    public id: string;
    public amqpKit: AmqpKit | null;
    public shutdownKit: typeof ShutdownKit;
    private options_: MicroserviceKitOptions;

    constructor(opt_options?: MicroserviceKitOptions) {
        super();

        this.options_ = _.assign({}, this.defaults, opt_options || {});
        this.id = new Chance().first().toLowerCase() + '-' + uuid().split('-')[0];
        this.amqpKit = null;
        this.shutdownKit = ShutdownKit;

        this.shutdownKit.on('log', (...args: any[]) => {
            this.emit('shutdownKitLog', ...args);
            args.splice(1, 0, '[shutdownkit]');
            this.emit('log', ...args);
        });
    }

    init(): Promise<void> {
        if (!this.options_.amqp) {
            return Promise.resolve();
        }

        const amqpOptions = _.assign({}, this.options_.amqp, { id: this.getName() });
        this.amqpKit = new AmqpKit(amqpOptions);

        this.amqpKit.on('log', (...args: any[]) => {
            this.emit('amqpKitLog', ...args);
            args.splice(1, 0, '[amqpkit]');
            this.emit('log', ...args);
        });

        this.amqpKit.on('consumedEvent', (payload: any) => this.emit('consumedEvent', payload));

        return this.amqpKit.init().then(() => undefined);
    }

    getName(): string {
        return this.options_.type + '-' + this.id;
    }

    get defaults(): MicroserviceKitOptions {
        return {
            type: 'microservice',
            amqp: {}
        };
    }
}

export default MicroserviceKit;

