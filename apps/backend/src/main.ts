import express from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { Client } from 'pg';
import { routes } from './routes';

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

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');    
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');    

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  next();
});

app.use(express.json());
app.use((req, res, next) => {
  console.log(`[BACKEND_TRAFFIC] ${req.method} ${req.url}`);
  next();
});
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/api', routes);

let pgConnected = false;

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

    // Executa o schema de usuários ao inicializar
    try {
      const sql = `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          is_root BOOLEAN DEFAULT FALSE,
          profile_picture_url TEXT,
          is_first_login BOOLEAN DEFAULT TRUE,
          is_active BOOLEAN DEFAULT TRUE,
          last_login_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_root BOOLEAN DEFAULT FALSE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_first_login BOOLEAN DEFAULT TRUE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
      `;
      await pg.query(sql);
      console.log('Postgres: schema de usuários atualizado com sucesso.');
    } catch (schemaErr) {
      console.error('Postgres: aviso ao rodar alteração no banco', schemaErr);
    }
  } catch (err) {
    pgConnected = false;
    console.error('Postgres: erro ao conectar', err);
  }
}

export function isPostgresConnected() {
  return pgConnected;
}

// Variáveis do sistema
const porta_api = process.env.API_PORTA;

async function bootstrap() {
  await connectPostgres();

  const server = app.listen(porta_api, () => {
    if (isPostgresConnected()) {
      console.log(
        `Servidor rodando em http://localhost:${porta_api}\n\ncom conexão com o banco de dados (BD_DATABASE=${process.env.BD_DATABASE ?? process.env.BD_NAME})`,
      );
    } else {
      console.log(
        `Servidor rodando em http://localhost:${porta_api}\n\nsem conexão com o banco de dados`,
      );
    }
  });
  server.on('error', console.error);
}

bootstrap().catch((err) => {
  console.error('Falha ao iniciar aplicação', err);
  process.exitCode = 1;
});