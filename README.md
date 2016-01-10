# microservice-kit

Utility belt for microservices.

## Quick Start

- Check out [/demos](https://github.com/signalive/microservice-kit/tree/master/demo) folder
- [A boilerplate for your new microservices](https://github.com/signalive/microservice-boilerplate)

# API Reference

## Class MicroserviceKit

This is the main class, the entry point to microservice-kit. To use it, you just need to import microservice-kit:

```javascript
const MicroserviceKit = require('microservice-kit');
```

To create an instance, look at constructor below. A microservice-kit instance is simply collection of an AmqpKit and a ShutdownKit instances.

#### `new MicroserviceKit(options={})`

##### Params

Name|Type|Description
----|----|-----------
options.type="microservice"|String|Type of the microservice. This name will be used as prefix in generating unique name. This is helpful when differentiating microservice instances.
options.amqp|Object|This object will be pass to AmqpKit when creating instance. See AmqpKit's docs for detail.
[options.shutdown.logger=null]|Function|This function will be passed into `ShutdownKit.setLogger` method. 

##### Sample

```javascript
const microserviceKit = new MicroserviceKit({
    type: 'core-worker',
    amqp: {
        url: "amqp://localhost",
        queues: [
            {
                name: "core",
                options: {durable: true}
            }
        ],
        exchanges: []
    }
});
```

#### `MicroserviceKit.prototype.amqpKit`

This amqpKit instance is automatically created for microservice. See AmqpKit for details.

```javascript
const coreQueue = microserviceKit.amqpKit.getQueue('core');
```

#### `MicroserviceKit.prototype.shutdownKit`

This shutdownKit (singleton) instance is automatically created for microservice. See ShutdownKit for details.

```
microserviceKit.shutdownKit.addJob(someFunction);
```

#### `MicroserviceKit.prototype.init()` -> `Promise`

Created instance is not ready yet, it will connect to rabbitmq. You should call this method when booting your app.

```javascript
microserviceKit
  .init()
  .then(() => {
    console.log("Initalized microservicekit!");
  })
  .catch((err) => {
    console.log("Cannot initalize microservicekit!", err);
  })
```

#### `MicroserviceKit.prototype.getName()` -> `String`

This is the unique name of the created instance. It begins with microservice type and followed by random string. Ex: `socket-worker-54a98630`

## Class AmqpKit

This is the AmqpKit class aims to help communication over RabbitMQ. Main features:
- Get callbacks like natively instead of low-level RabbitMQ RPC topologies
- Send & recieve events instead of messages. Events are just special message hierarchy.
- Send & recieve payloads in native JSON format instead of buffers.
- Progress support, a consumer can inform its progress to the producer.

AmqpKit uses `amqplib` in barebones. Look at [its documentation](http://www.squaremobius.net/amqp.node/channel_api.html). We will refer this page a lot.

```javascript
const AmqpKit = require('microservice-kit').AmqpKit;
```

You can reach AmqpKit class like above. However, if you create a MicroserviceKit instance you don't need to reach AmqpKit. An AmqpKit instance will be automatically created for you.

#### `new AmqpKit([options={}])`

**Only use this constructor for advanced usage!** An AmqpKit instance will be automatically created, if you use `new MicroserviceKit(options)` constructor. If so, `options.amqp` will be used while creating AmqpKit instance.

##### Params

Param|Type|Description
-----|----|-----------
[options.rpc=true]|Boolean|If you don't need to use callbacks for amqp communication, you can use `false`. If so, an extra rpc channel and queue will not be created. Default `true`.
options.queues=[]|Array|This queues will be asserted in `init` flow.
[options.queues[].name]|String|Name of queue on RabbitMQ. Optional. Do not pass any parameter if you want to create an exclusive queue. It will be generated automatically.
options.queues[].key|String|This is key value for accessing reference. This will be used for `AmqpKit.prototype.getQueue`.
options.queues[].options|Object|Options for the queue. See offical [amqplib assertQueue reference](http://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue).
options.exchanges=[]|Array|This exchanges will be asserted in `init` flow.
options.exchanges[].name|String|Name of exchange on RabbitMQ.
options.exchanges[].key|String|This is key value for accessing reference. This will be used for `AmqpKit.prototype.getExchange`.
options.exchanges[].type|String|`fanout`, `direct` or `topic`
options.exchanges[].options|Object|Options for the exchange. See offical [amqplib assertExchange reference](http://www.squaremobius.net/amqp.node/channel_api.html#channel_assertExchange).
[options.logger=null]|Function|AmqpKit can log incoming and outgoing events. It also logs how much time spend on consuming events or getting callback. You can use simply `console.log.bind(console)`.


##### Sample

```javascript
const amqpKit = new AmqpKit({
  queues: [
      {
          key: 'broadcast',
          options: {exclusive: true}
      },
      {
          key: 'direct',
          options: {exclusive: true}
      }
  ],
  exchanges: [
      {
          name: 'socket-broadcast',
          key: 'socket-broadcast',
          type: 'fanout',
          options: {}
      },
      {
          name: 'socket-direct',
          key: 'socket-direct',
          type: 'direct',
          options: {}
      }
  ],
  logger: function() {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[amqpkit]');
      console.log.apply(console, args);
  }
});
```

#### `AmqpKit.prototype.prefetch(count, [global])`

AmqpKit has two channels by default. The common channel, is used for recieving and sending messages in your microservice. Another channel is for getting rpc callbacks and used exclusively inside AmqpKit.
This method sets a limit the number of unacknowledged messages on the common channel. If this limit is reached, RabbitMQ won't send any events to microservice.

##### Params

Param|Type|Description
-----|----|-----------
count|Number|Set the prefetch count for the channel. The count given is the maximum number of messages sent over the channel that can be awaiting acknowledgement; once there are count messages outstanding, the server will not send more messages on this channel until one or more have been acknowledged. A falsey value for count indicates no such limit.
[global]|Boolean|Use the global flag to get the per-channel behaviour. Use `true` if you want to limit the whole microservice. RPC channel is seperate, so don't worry about callbacks.

##### Sample

```javascript
microserviceKit.amqpKit.prefetch(100, true);
```

This microservice can process maximum 100 events at the same time. (Event type does not matter) RabbitMQ won't send any message to the microservice until it completes some jobs.

#### `AmqpKit.prototype.getQueue(key)` -> `AmqpKit.Queue`

Gets queue instance by key.

Param|Type|Description
-----|----|-----------
key|String|Unique queue key.

#### `AmqpKit.prototype.getExchange(key)` -> `AmqpKit.Exchange`

Gets exchange instance by key.

Param|Type|Description
-----|----|-----------
key|String|Unique exhange key.

#### `AmqpKit.prototype.createQueue(key, name, options={})` -> `Promise.<AmqpKit.Queue>`

Creates (assert) a queue.

Param|Type|Description
-----|----|-----------
key|String|Unique queue key.
[name]|String|Name of queue on RabbitMQ. Optional. Pass empty string if you want to create an exclusive queue. It will be generated automatically.
options|Object|Options for the queue. See offical [amqplib assertQueue reference](http://www.squaremobius.net/amqp.node/channel_api.html#channel_assertQueue).

#### `AmqpKit.prototype.createExchange(key, name, type, options={})` -> `Promise.<AmqpKit.Exchange>`

Creates (asserts) an exchange.

Param|Type|Description
-----|----|-----------
key|String|Unique exhange key.
name|String|Name of exchange on RabbitMQ.
type|String|`fanout`, `direct` or `topic`
options|Object|Options for the exchange. See offical [amqplib assertExchange reference](http://www.squaremobius.net/amqp.node/channel_api.html#channel_assertExchange).

#### `AmqpKit.prototype.connection`

Native `ampqlib`s connection. See [offical docs](http://www.squaremobius.net/amqp.node/channel_api.html#connect).

#### `AmqpKit.prototype.channel`

Native `ampqlib`s channel instance that will be used commonly. See [offical docs](http://www.squaremobius.net/amqp.node/channel_api.html#channel).

## Class AmqpKit.Queue

This class is not exposed to user. When you do `amqpKit.getQueue()` or `amqpKit.createChannel()`, what you get is an instance of this class.

#### `AmqpKit.Queue.prototype.consumeEvent(eventName, callback, [options={}])`

Sends an event to queue.

##### Params

Param|Type|Description
-----|----|-----------
eventName|String|Event name.
callback|Function|Handler function. It takes 3 parameters: `payload`, `done`, `progress`. Payload is event payload. Done is node style callback that finalize the event: `done(err, payload)`. Both error and payload is optional. Error should be instaceof native Error class! Progress is optional callback that you can send progress events: `progress(payload)`. Progress events does not finalize events!
[options={}]|Object|Consume options. See `amqplib`s [offical consume docs](http://www.squaremobius.net/amqp.node/channel_api.html#channel_consume).

##### Sample

```javascript
const coreQueue = microserviceKit.amqpKit.getQueue('core');

coreQueue.consumeEvent('get-device', (payload, done, progress) => {
  // Optional progress events!
  let count = 0;
  let interval = setInterval(() => {
      progress({data: 'Progress ' + (++count) + '/5'});
  }, 1000);

  // complete job.
  setTimeout(() => {
      clearInterval(interval);
      callback(null, {some: 'Response!'});
  }, 5000);
}, {});
```

#### `AmqpKit.Queue.prototype.bind(exhange, pattern)` -> `Promise`

Assert a routing pattern from an exchange to the queue: the exchange named by source will relay messages to the queue named, according to the type of the exchange and the pattern given. 

##### Params

Param|Type|Description
-----|----|-----------
exchange|String|Name of exchange on RabbitMQ.
pattern|String|Binding pattern.

#### `AmqpKit.Queue.prototype.unbind(exchange, pattern)` -> `Promise`

Remove a routing path between the queue named and the exchange named as source with the pattern and arguments given.

Param|Type|Description
-----|----|-----------
exchange|String|Name of exchange on RabbitMQ.
pattern|String|Binding pattern.

#### `AmqpKit.Queue.prototype.getUniqueName()` -> `String`

Returns real queue name on RabbitMQ.

#### `AmqpKit.Queue.prototype.sendEvent(eventName, [payload={}], [options={}])` -> `Promise`

Sends an event with payload to the queue.

##### Params

Param|Type|Description
-----|----|-----------
eventName|String|Event name.
[payload]|Object|Payload data.
[options]|Object|See `ampqlib`s [official docs](http://www.squaremobius.net/amqp.node/channel_api.html#channel_publish).
[options.dontExpectRpc=false]|Boolean|Additional to `amqplib` options, we provide couple of functions too. If you don't want to callback for this message, set `true`. Default `false`.
[options.timeout=30000]|Number|Timeout duration. This check is totaly in producer side, if job is done after timeout, it's rpc message will be ignored. Pass `0` if you dont want to timeout.

##### Sample

```javascript
const coreQueue = microserviceKit.amqpKit.getQueue('core');

coreQueue
  .sendEvent('get-device', {id: 5}, {persistent: true})
  .progress((payload) => {
    console.log('The job is processing...', payload);
  })
  .success((payload) => {
    console.log('Device: ', payload);
  })
  .catch((err) => {
    console.log('Cannot get device', err);
  })
```

Notice the `.progress()` handler? It's just a additonal handler that AmqpKit puts for you. Instead of this, return value of this method is `Promise`.

## Class AmqpKit.Exchange

This class is not exposed to user. When you do `amqpKit.getExchange()` or `amqpKit.createExchange()`, what you get is an instance of this class.

#### `AmqpKit.Exchange.prototype.publishEvent(routingKey, eventName, [payload], [options])` -> `Promise`

Sends an event with payload to the exchange.

##### Params

Param|Type|Description
-----|----|-----------
routingKey|String|Routing pattern for event!
eventName|String|Event name.
[payload]|Object|Payload data.
[options]|Object|See `ampqlib`s [official docs](http://www.squaremobius.net/amqp.node/channel_api.html#channel_publish).
[options.dontExpectRpc=false]|Boolean|Additional to `amqplib` options, we provide couple of functions too. If you don't want to callback for this message, set `true`. Default `false`.
[options.timeout=30000]|Number|Timeout duration. This check is totaly in producer side, if job is done after timeout, it's rpc message will be ignored. Pass `0` if you dont want to timeout.

##### Sample

```javascript
const broadcastExchange = microserviceKit.amqpKit.getExchange('socket-broadcast');
broadcastExchange.publishEvent('', 'channel-updated', {channel: 'data'}, {dontExpectRpc: true});
```

## Class ShutdownKit

This class helps us to catch interrupt signals, uncaught exceptions and tries to perform jobs to shutdown gracefully. This class is singleton.

```javascript
// Direct access
const shutdownKit = require('microservice-kit').ShutdownKit;

// Or from microservice-kit instance
const microserviceKit = new MicroserviceKit({...});
console.log(microserviceKit.shutdownKit);
```

As you can see above, you can access ShutdownKit singleton instance multiple ways.


#### `ShutdownKit.prototype.addJob(job)`

Add a job to graceful shutdown process. When ShutdownKit tries to shutdown gracefully, it runs all the jobs in parallel.

##### Params

Param|Type|Description
-----|----|-----------
job|Function|This function takes `done` callback as single parameter. Execute `done` callback when job is completed. It's also like node-style callback: `done(err)`.

##### Sample

```javascript
shutdownKit.addJob((done) => {
    debug('Closing connection...');
    this.connection
      .close()
      .then(() => {
          done();
      })
      .catch(done);
});
```

#### `ShutdownKit.prototype.gracefulShutdown()`

This method gracefully shutdowns current node process.

#### `ShutdownKit.prototype.setLogger(logger)`

Sets a custom logger to print out shutdown process logs to console.

##### Params

Param|Type|Description
-----|----|-----------
job|Function|This function takes `done` callback as single parameter. Execute `done` callback when job is completed. It's also like node-style callback: `done(err)`.

##### Sample

```javascript
shutdownKit.setLogger(() => {
  var args = Array.prototype.slice.call(arguments);
  args.unshift('[shutdownkit]');
  console.log.apply(console, args);
});
```

As you can see, we convert all arguments to native array and prepends `[shutdown]` prefix. Then apply this arguments to standart console.log method.
