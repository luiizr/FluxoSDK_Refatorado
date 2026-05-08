import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { Client } from 'pg';
import { routes } from './routes';
import { createCorsMiddleware } from './middleware/cors';

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

app.use(createCorsMiddleware(pg));
app.use(express.json({ limit: '256kb' }));
app.use((req, _res, next) => {
  console.log(`[BACKEND_TRAFFIC] ${req.method} ${req.url}`);
  next();
});
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/api', routes);

let pgConnected = false;

async function runApplicationSchema() {
  const schemaPath = path.join(__dirname, 'database', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await pg.query(sql);
}

export async function connectPostgres() {
  try {
    console.log(
      'Postgres: tentando conectar com',
      JSON.stringify(
        {
          host: process.env.BD_HOST,
          port: process.env.BD_PORT,
          user: process.env.BD_USER,
        },
        null,
        2,
      ),
    );

    await pg.connect();
    pgConnected = true;
    console.log('Postgres: conectado');

    try {
      await runApplicationSchema();
      console.log('Postgres: schema principal atualizado com sucesso.');
    } catch (schemaErr) {
      console.error('Postgres: aviso ao rodar schema principal', schemaErr);
    }
  } catch (err) {
    pgConnected = false;
    console.error('Postgres: erro ao conectar', err);
  }
}

export function isPostgresConnected() {
  return pgConnected;
}

const porta_api = process.env.API_PORTA;

async function bootstrap() {
  await connectPostgres();

  const server = app.listen(porta_api, () => {
    if (isPostgresConnected()) {
      console.log(
        `Servidor rodando em http://localhost:${porta_api}\n\ncom conexao com o banco de dados (BD_DATABASE=${process.env.BD_DATABASE ?? process.env.BD_NAME})`,
      );
    } else {
      console.log(`Servidor rodando em http://localhost:${porta_api}\n\nsem conexao com o banco de dados`);
    }
  });
  server.on('error', console.error);
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar aplicacao', err);
  process.exitCode = 1;
});
