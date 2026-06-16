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
    const { name, data } = job;
    const { sessionId, siteKey, visitorId, metadata, events, ip } = data;

    if (name === 'process-session-init') {
      console.log(`[WORKER] [0/5] Inicializando sessão no banco: ${sessionId}`);
      
      // Aqui poderíamos usar ua-parser-js. Como não está instalado, salvamos metadados brutos 
      // e o processamento pode ser feito em uma camada de serviço.
      await pg.query(
        `INSERT INTO browser_sessions (
          site_key, visitor_id, session_id, 
          user_agent, ip_address, screen_resolution, language,
          last_seen_at
        )
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (session_id) 
         DO UPDATE SET 
            last_seen_at = NOW(), 
            visitor_id = EXCLUDED.visitor_id,
            user_agent = EXCLUDED.user_agent,
            ip_address = EXCLUDED.ip_address,
            screen_resolution = EXCLUDED.screen_resolution,
            language = EXCLUDED.language`,
        [
          siteKey, 
          visitorId, 
          sessionId, 
          metadata?.userAgent, 
          ip, 
          metadata?.screenResolution, 
          metadata?.language
        ],
      );
      return { success: true };
    }

    if (name === 'process-metrics') {
      console.log(`[WORKER] [5/5] Processando métricas no banco para sessão ${sessionId}`);

      try {
        // 1. Garantir que a sessão existe (caso o init tenha falhado ou chegado depois)
        await pg.query(
          `INSERT INTO browser_sessions (site_key, visitor_id, session_id, last_seen_at, ip_address)
           VALUES ($1, $2, $3, NOW(), $4)
           ON CONFLICT (session_id) 
           DO UPDATE SET last_seen_at = NOW(), ip_address = EXCLUDED.ip_address`,
          [siteKey, visitorId, sessionId, ip],
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
    }
  },
  { connection: redisConnection as any },
);

console.log('BullMQ: Workers inicializados');
