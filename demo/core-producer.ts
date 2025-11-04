import MicroserviceKit from '../src';

const microserviceKit = new MicroserviceKit({
    type: 'some-core-producer-worker',
    amqp: {
        queues: [
            {
                name: 'core',
                key: 'core',
                options: { durable: true }
            }
        ]
    }
});

microserviceKit
    .init()
    .then(() => {
        const coreQueue = microserviceKit.amqpKit!.getQueue('core')!;

        coreQueue
            .sendEvent('deneme.job', { some: 'data!' }, { persistent: true })
            .progress((data: any) => {
                console.log('Progressing...' + JSON.stringify(data));
            })
            .then((response: any) => {
                console.log('Positive response: ' + JSON.stringify(response));
            })
            .catch((err: Error) => {
                console.log('Negative response: ', err);
            });
    })
    .catch((err: Error) => {
        console.log('Cannot boot');
        console.log(err.stack);
    });

