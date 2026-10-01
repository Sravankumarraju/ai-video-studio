import { Queue } from "bullmq";
import IORedis from "ioredis";
export function redis() {
  return new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  });
}
let queue: Queue | undefined;
let queueConnection: IORedis | undefined;
export function jobQueue() {
  return (queue ??= new Queue("story-studio", {
    connection: (queueConnection ??= redis()),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 15000 },
      removeOnComplete: 1000,
      removeOnFail: 1000,
    },
  }));
}
export async function closeQueue() {
  if (queue) await queue.close();
  if (queueConnection) await queueConnection.quit();
  queue = undefined;
  queueConnection = undefined;
}
