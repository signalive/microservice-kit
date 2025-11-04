import MicroserviceKit, { ErrorType } from '../src';

const microserviceKit = new MicroserviceKit({
    type: 'core-worker',
    amqp: {
        queues: [
            {
                name: 'core',
                key: 'core',
                options: { durable: true }
            }
        ]
    },
    shutdown: {
        logger: function(...args: any[]) {
            console.log('[shutdownkit]', ...args);
        }
    }
});

microserviceKit
    .init()
    .then(() => {
        // Run phase
        console.log("Waiting for messages in %s. To exit press CTRL+C", 'core');

        const coreQueue = microserviceKit.amqpKit!.getQueue('core')!;

        // Consume some core jobs!
        coreQueue.consumeEvent('deneme.job', (data, callback, progress, routingKey) => {
            console.log("Received: " + JSON.stringify(data));
            console.log("The routing key of the job was", routingKey);

            // Dummy progress events
            let count = 0;
            const interval = setInterval(() => {
                progress({ data: 'Progress ' + (++count) + '/5' });
            }, 1000);

            // Dummy complete job.
            setTimeout(() => {
                clearInterval(interval);
                callback(new ErrorType.ClientError('Anaynin amugg'));
                // callback(null, {some: 'Responseee!'});
                console.log('Done.');
            }, 5000);
        });
    })
    .catch((err: Error) => {
        console.log('Cannot boot');
        console.log(err.stack);
    });

