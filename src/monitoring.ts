import { Queue, QueueEvents } from 'bullmq';
import { connection } from './config/redis';

const queue = new Queue('pdf-rendering', { connection });
const queueEvents = new QueueEvents('pdf-rendering', { connection });

async function getQueueMetrics() {
  const [waiting, active, completed, failed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount()
  ]);

  return { waiting, active, completed, failed };
}

// Log metrics every 30 seconds
setInterval(async () => {
  const metrics = await getQueueMetrics();
  console.log('Queue Metrics:', metrics);
}, 30000);