import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisConnection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
});

redisConnection.on('connect', () => {
  console.log('Redis: conectado');
});

redisConnection.on('error', (err) => {
  console.error('Redis: erro ao conectar', err);
});
