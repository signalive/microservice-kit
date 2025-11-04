# Demo Examples

This directory contains TypeScript examples demonstrating the usage of microservice-kit.

## Prerequisites

Make sure you have built the project first:

```bash
bun run build
```

## Running the Examples

You can run these TypeScript demo files directly with Bun:

```bash
# Core worker example
bun run demo/core.ts

# Core producer example
bun run demo/core-producer.ts

# Socket worker example
bun run demo/socket.ts

# Socket producer example
bun run demo/socket-producer.ts

# Media producer example
bun run demo/media-producer.ts
```

## Examples Overview

### Core Queue Example

- **core.ts** - Consumer that processes jobs from a core queue
- **core-producer.ts** - Producer that sends jobs to the core queue

### Socket Exchange Example

- **socket.ts** - Consumer that listens to broadcast and direct exchanges
- **socket-producer.ts** - Producer that publishes messages to exchanges

### Media Queue Example

- **media-producer.ts** - Producer that sends media processing jobs

## Requirements

- RabbitMQ server running on `amqp://localhost`
- Built project (`bun run build`)

