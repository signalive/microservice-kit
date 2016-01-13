'use strict';

const MicroserviceKit = require('../src');


const microserviceKit = new MicroserviceKit({
    type: 'debug-worker',
    debugger: true
});

microserviceKit
    .init()
    .then(() => {
        const debugKit = microserviceKit.debugKit;
        setInterval(() => {
            console.log(JSON.stringify(debugKit.getMicroservices(), '', 4));
        }, 3000);
    })
    .catch((err) => {
        console.log('Cannot boot');
        console.log(err);
    });
