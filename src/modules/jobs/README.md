# Jobs Module

This module integrates [BullMQ](https://docs.bullmq.io/) to handle background job processing. It defines two default queues—`emails` and `uploads`—and provides helper functions and workers to process jobs.

## Setup

Ensure `REDIS_URL` is set in your environment. The queues automatically use a Redis connection if available; otherwise they fall back to an in-memory store (not recommended for production).

### Starting Workers

Import `startWorkers` in your application entry point or a separate worker process to process queued jobs:

```ts
import { startWorkers } from './modules/jobs/worker';
startWorkers();
```

### Enqueuing Jobs

You can enqueue jobs by importing the queue or helper functions. For example, to send a welcome email:

```ts
import { enqueueExampleEmail } from './modules/jobs/jobs/example.job';
await enqueueExampleEmail('user@example.com');
```
