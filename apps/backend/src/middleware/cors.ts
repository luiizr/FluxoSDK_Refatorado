import { RequestHandler } from 'express';
import { Client } from 'pg';

const DEFAULT_DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:4002',
  'http://localhost:4200',
  'http://localhost:5173',
];

function normalizeOrigin(origin: string | undefined): string | undefined {
  if (!origin) return undefined;

  try {
    const parsed = new URL(origin);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return undefined;
  }
}

function parseOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((origin) => normalizeOrigin(origin.trim()))
    .filter((origin): origin is string => Boolean(origin));
}

function domainMatchesOrigin(domain: string | null, origin: string): boolean {
  if (!domain) return false;

  try {
    const parsed = new URL(origin);
    const normalizedDomain = domain
      .replace(/^https?:\/\//i, '')
      .replace(/\/.*$/, '')
      .toLowerCase();
    return parsed.hostname.toLowerCase() === normalizedDomain;
  } catch {
    return false;
  }
}

function extractSiteKey(req: Parameters<RequestHandler>[0]): string | undefined {
  const headerKey = req.header('x-fluxo-site-key');
  const queryKey = req.query.site_key ?? req.query.siteKey;
  const bodyKey =
    req.body && typeof req.body === 'object'
      ? req.body.site_key ?? req.body.siteKey
      : undefined;

  const key = headerKey ?? queryKey ?? bodyKey;
  return typeof key === 'string' && key.trim() ? key.trim() : undefined;
}

async function isSdkOriginAllowed(
  client: Client,
  origin: string,
  siteKey: string | undefined,
  isProduction: boolean
): Promise<boolean> {
  if (!siteKey) return !isProduction && DEFAULT_DEV_ORIGINS.includes(origin);

  const siteResult = await client.query<{
    domain: string | null;
    allowed_origins: string[] | null;
  }>(
    `
      SELECT s.domain, COALESCE(s.allowed_origins, '[]'::jsonb) AS allowed_origins
      FROM site_keys sk
      JOIN sites s ON s.id = sk.site_id
      WHERE sk.public_key = $1
        AND sk.active = true
        AND s.active = true
      LIMIT 1
    `,
    [siteKey]
  );

  if (!siteResult.rowCount) return false;

  const site = siteResult.rows[0];
  const configuredOrigins = Array.isArray(site.allowed_origins)
    ? site.allowed_origins.map((item) => normalizeOrigin(item)).filter(Boolean)
    : [];

  return (
    configuredOrigins.includes(origin) ||
    domainMatchesOrigin(site.domain, origin) ||
    (!isProduction && DEFAULT_DEV_ORIGINS.includes(origin))
  );
}

export function createCorsMiddleware(client: Client): RequestHandler {
  const isProduction = process.env.NODE_ENV === 'production';
  const privateOrigins = [
    ...DEFAULT_DEV_ORIGINS,
    ...parseOrigins(process.env.PAINEL_ALLOWED_ORIGINS),
    ...parseOrigins(process.env.ADMIN_ALLOWED_ORIGINS),
  ];

  return async (req, res, next) => {
    const origin = normalizeOrigin(req.header('Origin'));

    if (!origin) {
      if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
      }
      next();
      return;
    }

    let allowed = false;

    try {
      if (req.path === '/api/sdk/events') {
        allowed = await isSdkOriginAllowed(
          client,
          origin,
          extractSiteKey(req),
          isProduction
        );
      } else {
        allowed = privateOrigins.includes(origin);
      }
    } catch (error) {
      console.error('[cors] Failed to validate origin', error);
      allowed = false;
    }

    if (!allowed) {
      if (req.method === 'OPTIONS') {
        res.status(403).end();
        return;
      }

      res.status(403).json({ error: 'Origin not allowed' });
      return;
    }

    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, x-user-id, x-fluxo-site-key'
    );

    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }

    next();
  };
}
