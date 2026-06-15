import express from 'express';
import * as path from 'path';
import { Client } from 'pg';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { routes } from './routes';
import { createCorsMiddleware } from './middleware/cors';
import { recordingQueue, metricsQueue } from './infrastructure/queues';
import './infrastructure/workers'; // Importar para iniciar os workers

export const pg = new Client({
  host: process.env.BD_HOST,
  port: process.env.BD_PORT ? Number(process.env.BD_PORT) : undefined,
  user: process.env.BD_USER,
  password: process.env.BD_PASSWORD,
  database: process.env.BD_DATABASE ?? process.env.BD_NAME,
  connectionTimeoutMillis: process.env.BD_TIMEOUT_MS
    ? Number(process.env.BD_TIMEOUT_MS)
    : 5000,
});

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  },
  allowEIO3: true // Compatibilidade com versões mais antigas se necessário
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use(createCorsMiddleware(pg));
app.use(express.json({ limit: '50mb' })); // Aumentado para lidar com eventos rrweb se necessário via HTTP
app.use((req, _res, next) => {
  console.log(`[BACKEND_TRAFFIC] ${req.method} ${req.url}`);
  next();
});
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(routes);
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Socket.io logic
io.on('connection', (socket) => {
  console.log(`[BACKEND] Socket conectado: ${socket.id}`);

  socket.on('rrweb-batch', async (data) => {
    console.log(`[BACKEND] [4/5] Recebido lote de ${data.events.length} eventos da sessão ${data.sessionId}`);
    
    try {
      console.log(`[BACKEND] Encaminhando para BullMQ (Redis)...`);
      // 1. Enviar para processamento de gravação (Data Lake)
      await recordingQueue.add('process-batch', data);
      
      // 2. Enviar para processamento de métricas (Postgres)
      await metricsQueue.add('process-metrics', data);
      
      console.log(`[BACKEND] Jobs adicionados com sucesso ao BullMQ.`);
    } catch (err) {
      console.error(`[BACKEND] Erro ao adicionar jobs ao BullMQ:`, err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[BACKEND] Socket desconectado: ${socket.id}`);
  });
});

let pgConnected = false;

export async function connectPostgres() {
  try {
    console.log(
      'Postgres: tentando conectar...',
    );

    await pg.connect();
    pgConnected = true;
    console.log('Postgres: conectado');
  } catch (err) {
    pgConnected = false;
    console.error('Postgres: erro ao conectar', err);
  }
}

export function isPostgresConnected() {
  return pgConnected;
}

const porta_api = process.env.API_PORTA || 3000;

async function bootstrap() {
  await connectPostgres();

  httpServer.listen(porta_api, () => {
    if (isPostgresConnected()) {
      console.log(
        `Servidor rodando em http://localhost:${porta_api}\n\ncom conexao com o banco de dados e Socket.io ativo`,
      );
    } else {
      console.log(`Servidor rodando em http://localhost:${porta_api}\n\nsem conexao com o banco de dados mas Socket.io ativo`);
    }
  });
  httpServer.on('error', console.error);
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar aplicacao', err);
  process.exitCode = 1;
});
