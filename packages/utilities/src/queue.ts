import { Queue, Worker, type Job, type JobsOptions, type Processor } from 'bullmq';
import IORedis from 'ioredis';

/** Background jobs need Redis; without REDIS_URL callers fall back to doing the work inline. */
export const queueingEnabled = (): boolean => Boolean(process.env.REDIS_URL);

const redisUrl = () => process.env.REDIS_URL ?? 'redis://localhost:6379';

let workerConnection: IORedis | null = null;
let producerConnection: IORedis | null = null;

/** Blocking connection for Workers — BullMQ requires maxRetriesPerRequest: null. */
export function createRedisConnection(): IORedis {
  if (!workerConnection) workerConnection = new IORedis(redisUrl(), { maxRetriesPerRequest: null });
  return workerConnection;
}

// Producers must fail fast instead of queueing commands while Redis is
// down, so a request that enqueues a job (signup sending an OTP, a sale
// raising a low-stock alert) never hangs on an outage — callers fall back.
function producerRedis(): IORedis {
  if (!producerConnection) {
    producerConnection = new IORedis(redisUrl(), { maxRetriesPerRequest: 1, enableOfflineQueue: false, connectTimeout: 2_000 });
    producerConnection.on('error', () => {}); // surfaced via rejected add()
  }
  return producerConnection;
}

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 8,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: 1_000,
  removeOnFail: 5_000,
};

const queues = new Map<string, Queue>();

export function createQueue<T = unknown>(name: string): Queue<T> {
  const existing = queues.get(name);
  if (existing) return existing as Queue<T>;
  const queue = new Queue<T>(name, { connection: producerRedis(), defaultJobOptions: DEFAULT_JOB_OPTIONS });
  queue.on('error', () => {});
  queues.set(name, queue as Queue);
  return queue;
}

/** Adds a job, rejecting within `timeoutMs` if Redis can't take it. */
export async function enqueue<T>(name: string, jobName: string, data: T, opts?: JobsOptions, timeoutMs = 3_000): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Redis did not accept job within ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    await Promise.race([createQueue<T>(name).add(jobName as never, data as never, opts), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export function createWorker<T = unknown>(name: string, processor: Processor<T>, concurrency = 5): Worker<T> {
  const worker = new Worker<T>(name, processor, { connection: createRedisConnection(), concurrency });
  worker.on('failed', (job: Job<T> | undefined, err: Error) => {
    console.error(`[queue:${name}] job ${job?.id} failed (attempt ${job?.attemptsMade}):`, err.message);
  });
  worker.on('error', (err) => console.error(`[queue:${name}] worker error:`, err.message));
  return worker;
}
