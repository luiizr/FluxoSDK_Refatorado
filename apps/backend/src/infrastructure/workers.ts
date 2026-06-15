import { Worker } from 'bullmq';
import { redisConnection } from './redis';
import { pg } from '../main';
import * as fs from 'fs';
import * as path from 'path';

// Garantir que o diretório de gravações existe (Simulando Data Lake local para MVP)
const recordingsDir = path.join(process.cwd(), 'recordings');
if (!fs.existsSync(recordingsDir)) {
  fs.mkdirSync(recordingsDir);
}

// Worker para salvar a gravação completa (JSON gigante)
export const recordingWorker = new Worker(
  'recording-processing',
  async (job) => {
    const { sessionId, events, siteKey } = job.data;
    console.log(`[WORKER] [5/5] Gravando arquivo JSON da sessão ${sessionId}`);

    // Em um cenário real de "Data Lake", salvaríamos no Supabase Storage ou S3
    const fileName = `${siteKey}_${sessionId}.json`;
    const filePath = path.join(recordingsDir, fileName);

    let existingEvents = [];
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      existingEvents = JSON.parse(content);
    }

    const allEvents = [...existingEvents, ...events];
    fs.writeFileSync(filePath, JSON.stringify(allEvents));
    console.log(`[WORKER] Gravação salva em: ${filePath}`);

    return { success: true, path: filePath };
  },
  { connection: redisConnection as any },
);

// Worker para processar métricas e salvar no Postgres
export const metricsWorker = new Worker(
  'metrics-processing',
  async (job) => {
    const { sessionId, siteKey, visitorId, url, path: pagePath, title, events } = job.data;
    console.log(`[WORKER] [5/5] Processando métricas no banco para sessão ${sessionId}`);

    try {
      // 1. Garantir que a sessão existe
      await pg.query(
        `INSERT INTO browser_sessions (site_key, visitor_id, session_id, last_seen_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (session_id) 
         DO UPDATE SET last_seen_at = NOW(), visitor_id = EXCLUDED.visitor_id`,
        [siteKey, visitorId, sessionId],
      );

      // 2. Calcular métricas básicas do lote
      const clickCount = events.filter((e: any) => e.type === 3 && e.data?.source === 2).length; // rrweb click
      const eventCount = events.length;

      // 3. Atualizar métricas da sessão
      await pg.query(
        `INSERT INTO session_metrics (session_id, event_count, click_count)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO NOTHING`,
        [sessionId, eventCount, clickCount],
      );
      
      // Update incrementando métricas se já existir
      await pg.query(
        `UPDATE session_metrics 
         SET event_count = event_count + $2, 
             click_count = click_count + $3,
             duration_seconds = duration_seconds + 5
         WHERE session_id = $1`,
        [sessionId, eventCount, clickCount]
      );
      console.log(`[WORKER] Métricas atualizadas no Postgres para sessão ${sessionId}`);

    } catch (err) {
      console.error('[WORKER] Erro no processamento de métricas:', err);
      throw err;
    }
  },
  { connection: redisConnection as any },
);

console.log('BullMQ: Workers inicializados');
