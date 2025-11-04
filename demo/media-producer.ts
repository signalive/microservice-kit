import MicroserviceKit from '../src';

const microserviceKit = new MicroserviceKit({
    type: 'some-media-producer-worker',
    amqp: {
        queues: [
            {
                name: 'media',
                key: 'media',
                options: { durable: true }
            }
        ]
    }
});

microserviceKit
    .init()
    .then(() => {
        const mediaQueue = microserviceKit.amqpKit!.getQueue('media')!;

        mediaQueue
            .sendEvent('media-process', {
                id: '123456',
                mediaUrl: ''
            }, { persistent: true })
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

