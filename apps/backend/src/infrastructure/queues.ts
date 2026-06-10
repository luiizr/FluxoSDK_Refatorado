import { Queue, Worker } from 'bullmq';
import { redisConnection } from './redis';

export const recordingQueue = new Queue('recording-processing', {
  connection: redisConnection as any,
});

export const metricsQueue = new Queue('metrics-processing', {
  connection: redisConnection as any,
});

console.log('BullMQ: Filas inicializadas');
