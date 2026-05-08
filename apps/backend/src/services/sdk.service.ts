import { pg } from '../main';
import type { ReceiveSdkEventsPayload, SdkEvent } from '../entities/sdk.entities';
import { EventProcessingService } from './event-processing.service';

type DashboardScope = {
  siteKey: string;
  userId?: string;
  rangeHours?: number;
};

const MAX_EVENTS_PER_REQUEST = 100;
const MAX_METADATA_BYTES = 8 * 1024;
const MAX_STRING_LENGTH = 512;
const MAX_ELEMENT_TEXT_LENGTH = 160;
const DEFAULT_RANGE_HOURS = 24;

const ALLOWED_EVENT_TYPES = new Set([
  'page_view',
  'route_change',
  'navigation',
  'page_leave',
  'click',
  'dead_click',
  'rage_click',
  'form_start',
  'form_submit',
  'form_abandon',
  'field_error',
  'form_error',
  'input_focus',
  'input_blur',
  'scroll_depth',
  'web_vital',
  'performance',
  'js_error',
  'resource_error',
  'api_error',
  'custom',
  'identify',
]);

const EVENT_TYPE_ALIASES: Record<string, string> = {
  navigation: 'route_change',
  form_error: 'field_error',
};

const SENSITIVE_KEY_PATTERN =
  /(password|pass|pwd|token|secret|authorization|cookie|session|email|e-mail|phone|cpf|cnpj|document|card|credit|cvv|iban|ssn)/i;

type NormalizedSdkEvent = {
  eventId: string;
  type: string;
  name?: string;
  pageId: string;
  url: string;
  path: string;
  title: string;
  occurredAt: string;
  metadata: Record<string, unknown>;
  context: Record<string, unknown>;
};

type NormalizedPayload = {
  siteKey: string;
  visitorId: string | null;
  sessionId: string;
  userIdentifier: string | null;
  sentAt: string;
  context: Record<string, unknown>;
  events: NormalizedSdkEvent[];
  originalEventCount: number;
};

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asInt(value: unknown, fallback = 0) {
  return Math.round(asNumber(value, fallback));
}

function truncateText(value: unknown, maxLength = MAX_STRING_LENGTH) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength);
}

function sanitizeJsonValue(value: unknown, depth = 0): unknown {
  if (depth > 4) return undefined;
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return truncateText(value);
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean') return value;

  if (Array.isArray(value)) {
    return value
      .slice(0, 25)
      .map((item) => sanitizeJsonValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) continue;
      const sanitized = sanitizeJsonValue(item, depth + 1);
      if (sanitized !== undefined) output[truncateText(key, 64)] = sanitized;
    }
    return output;
  }

  return undefined;
}

function safeJson(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const sanitized = sanitizeJsonValue(value);
  const result =
    sanitized && typeof sanitized === 'object' && !Array.isArray(sanitized)
      ? (sanitized as Record<string, unknown>)
      : {};

  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > MAX_METADATA_BYTES) {
    throw new Error('metadata excede o limite permitido');
  }

  return result;
}

function normalizeEventType(value: unknown) {
  const eventType = truncateText(value, 80);
  if (!eventType || !ALLOWED_EVENT_TYPES.has(eventType)) {
    throw new Error('event_type invalido');
  }

  return EVENT_TYPE_ALIASES[eventType] ?? eventType;
}

function buildEventId(event: SdkEvent, index: number) {
  const eventId = event.eventId ?? event.event_id;
  if (eventId) return truncateText(eventId, 128);

  const base = `${event.occurredAt ?? event.occurred_at ?? Date.now()}-${index}`;
  return `evt_${Buffer.from(base).toString('base64url').slice(0, 32)}_${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRangeHours(value?: number) {
  if (!value || !Number.isFinite(value)) return DEFAULT_RANGE_HOURS;
  return Math.min(Math.max(Math.round(value), 1), 24 * 90);
}

export class SdkService {
  private eventProcessingService = new EventProcessingService();

  async receiveEvents(input: ReceiveSdkEventsPayload) {
    const payload = this.normalizePayload(input);

    const keyResult = await pg.query(
      `
        SELECT k.active, k.site_id, s.active as site_active
        FROM site_keys k
        JOIN sites s ON s.id = k.site_id
        WHERE k.public_key = $1
      `,
      [payload.siteKey],
    );

    if (keyResult.rowCount === 0) {
      throw new Error('siteKey invalido ou inexistente');
    }

    if (!keyResult.rows[0].active || !keyResult.rows[0].site_active) {
      throw new Error('siteKey ou site esta desativado');
    }

    const siteId = String(keyResult.rows[0].site_id);
    payload.events.forEach((event) => this.validateEvent(event));

    await pg.query('BEGIN');
    try {
      await this.upsertVisitor(siteId, payload.siteKey, payload.visitorId);
      await this.upsertSession(
        payload.siteKey,
        payload.sessionId,
        payload.visitorId,
        payload.userIdentifier,
        payload.context,
      );
      await this.upsertTenantSession(siteId, payload);

      for (const event of payload.events) {
        const context = { ...payload.context, ...event.context };
        await this.insertRawEvent(siteId, payload.siteKey, payload.sessionId, payload.visitorId, event, context);
        await this.insertEvent(payload.siteKey, payload.sessionId, payload.visitorId, event, event.metadata, context);
        await this.updateVisitIndexes(payload.siteKey, payload.sessionId, payload.visitorId, event, event.metadata);
        await this.eventProcessingService.processAcceptedEvent(siteId, payload.visitorId, payload.sessionId, event);

        if (event.type === 'identify') {
          await this.updateSessionIdentity(
            payload.siteKey,
            payload.sessionId,
            String(event.metadata['userId'] ?? payload.userIdentifier ?? ''),
          );
        }
      }

      await pg.query('COMMIT');
    } catch (error) {
      await pg.query('ROLLBACK');
      throw error;
    }

    return {
      siteKey: payload.siteKey,
      sessionId: payload.sessionId,
      sentAt: payload.sentAt,
      totalReceivedEvents: payload.events.length,
      droppedEvents: Math.max(payload.originalEventCount - payload.events.length, 0),
    };
  }

  async listRecentEvents(limit = 30, siteKey?: string, userId?: string) {
    if (siteKey) {
      await this.assertSiteAccess(siteKey, userId);
    } else if (userId) {
      await this.assertRoot(userId);
    } else {
      throw new Error('Usuario nao autenticado');
    }

    const values: unknown[] = [Math.min(Math.max(limit, 1), 100)];
    const filters: string[] = [];

    if (siteKey) {
      values.push(siteKey);
      filters.push(`e.site_key = $${values.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await pg.query(
      `
        SELECT
          e.site_key,
          e.visitor_id,
          e.session_id,
          e.page_id,
          e.event_id,
          e.event_type,
          e.event_name,
          e.url,
          e.path,
          e.title,
          e.occurred_at,
          e.metadata,
          e.context,
          e.created_at
        FROM sdk_events e
        ${whereClause}
        ORDER BY e.occurred_at DESC
        LIMIT $1
      `,
      values,
    );

    return result.rows;
  }

  async getStats(scope: DashboardScope) {
    const siteKey = scope.siteKey;
    if (!siteKey) throw new Error('siteKey e obrigatorio');

    await this.assertSiteAccess(siteKey, scope.userId);

    const rangeHours = normalizeRangeHours(scope.rangeHours);
    const [summary, topPages, topClicks, problemInteractions, formMetrics, errors, webVitals, devices, sources] =
      await Promise.all([
        this.getSummary(siteKey, rangeHours),
        this.getTopPages(siteKey, rangeHours),
        this.getTopClicks(siteKey, rangeHours),
        this.getProblemInteractions(siteKey, rangeHours),
        this.getFormMetrics(siteKey, rangeHours),
        this.getErrors(siteKey, rangeHours),
        this.getWebVitals(siteKey, rangeHours),
        this.getDevices(siteKey, rangeHours),
        this.getTrafficSources(siteKey, rangeHours),
      ]);

    return {
      rangeHours,
      summary,
      topPages,
      topClicks,
      problemInteractions,
      formMetrics,
      errors,
      webVitals,
      devices,
      trafficSources: sources,
    };
  }

  async assertSiteAccess(siteKey: string, userId?: string) {
    if (!userId) throw new Error('Usuario nao autenticado');

    const result = await pg.query(
      `
        SELECT u.is_root, s.id
        FROM users u
        LEFT JOIN sites s ON (s.user_id = u.id OR u.is_root = true)
        LEFT JOIN site_keys k ON k.site_id = s.id
        WHERE u.id = $1 AND k.public_key = $2
        LIMIT 1
      `,
      [userId, siteKey],
    );

    if (result.rowCount === 0) {
      throw new Error('Site nao encontrado ou sem permissao');
    }
  }

  async assertRoot(userId: string) {
    const result = await pg.query(`SELECT is_root FROM users WHERE id = $1`, [userId]);
    if (result.rowCount === 0 || !result.rows[0].is_root) {
      throw new Error('Acesso restrito ao administrador');
    }
  }

  private normalizePayload(input: ReceiveSdkEventsPayload): NormalizedPayload {
    const siteKey = truncateText(input.siteKey ?? input.site_key, 128);
    const sessionId = truncateText(input.sessionId ?? input.session_id, 128);
    const visitorId = truncateText(input.visitorId ?? input.visitor_id, 128) || null;
    const userIdentifier = truncateText(input.userIdentifier ?? input.user_identifier, 256) || null;
    const sentAt = truncateText(input.sentAt ?? input.sent_at ?? new Date().toISOString(), 64);

    if (!siteKey) throw new Error('siteKey e obrigatorio');
    if (!sessionId) throw new Error('sessionId e obrigatorio');
    if (!Array.isArray(input.events) || input.events.length === 0) {
      throw new Error('events deve ser um array com pelo menos um item');
    }

    const context = safeJson(input.context);
    const events = input.events.slice(0, MAX_EVENTS_PER_REQUEST).map((event, index) => {
      const metadata = safeJson(event.metadata);
      const element = event.element ?? {};
      const elementMetadata = {
        selector: truncateText(element.selector ?? metadata['selector'], 256),
        text: truncateText(element.text ?? metadata['text'], MAX_ELEMENT_TEXT_LENGTH),
        tag: truncateText(element.tag ?? metadata['tag'], 64).toLowerCase(),
      };

      Object.entries(elementMetadata).forEach(([key, value]) => {
        if (value) metadata[key] = value;
      });

      return {
        eventId: buildEventId(event, index),
        type: normalizeEventType(event.type ?? event.event_type),
        name: event.name ? truncateText(event.name, 128) : undefined,
        pageId: truncateText(event.pageId ?? event.page_id ?? event.path ?? event.url, 256),
        url: truncateText(event.url, 2048),
        path: truncateText(event.path, 1024),
        title: truncateText(event.title ?? '', 256),
        occurredAt: truncateText(event.occurredAt ?? event.occurred_at ?? new Date().toISOString(), 64),
        metadata,
        context: safeJson(event.context),
      };
    });

    return {
      siteKey,
      visitorId,
      sessionId,
      userIdentifier,
      sentAt,
      context,
      events,
      originalEventCount: input.events.length,
    };
  }

  private validateEvent(event: NormalizedSdkEvent) {
    if (!event.eventId) throw new Error('eventId e obrigatorio');
    if (!event.type) throw new Error('type e obrigatorio');
    if (!event.pageId) throw new Error('pageId e obrigatorio');
    if (!event.url) throw new Error('url e obrigatorio');
    if (!event.path) throw new Error('path e obrigatorio');
    if (!event.title && event.title !== '') throw new Error('title e obrigatorio');
    if (!event.occurredAt) throw new Error('occurredAt e obrigatorio');
  }

  private async upsertVisitor(siteId: string, siteKey: string, visitorId: string | null) {
    if (!visitorId) return;

    await pg.query(
      `
        INSERT INTO visitors (site_id, site_key, visitor_id, first_seen_at, last_seen_at)
        VALUES ($1, $2, $3, NOW(), NOW())
        ON CONFLICT (site_id, visitor_id)
        DO UPDATE SET last_seen_at = NOW(), site_key = EXCLUDED.site_key
      `,
      [siteId, siteKey, visitorId],
    );
  }

  private async upsertSession(
    siteKey: string,
    sessionId: string,
    visitorId: string | null,
    userIdentifier: string | null,
    context: Record<string, unknown>,
  ) {
    await pg.query(
      `
        INSERT INTO browser_sessions (site_key, visitor_id, session_id, user_identifier, context)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        ON CONFLICT (site_key, session_id)
        DO UPDATE SET
          visitor_id = COALESCE(EXCLUDED.visitor_id, browser_sessions.visitor_id),
          user_identifier = COALESCE(EXCLUDED.user_identifier, browser_sessions.user_identifier),
          context = COALESCE(browser_sessions.context, '{}'::jsonb) || EXCLUDED.context,
          last_seen_at = NOW()
      `,
      [siteKey, visitorId, sessionId, userIdentifier, JSON.stringify(context)],
    );
  }

  private async updateSessionIdentity(siteKey: string, sessionId: string, userIdentifier: string) {
    if (!userIdentifier) return;

    await pg.query(
      `
        UPDATE browser_sessions
        SET user_identifier = $3, last_seen_at = NOW()
        WHERE site_key = $1 AND session_id = $2
      `,
      [siteKey, sessionId, userIdentifier],
    );
  }

  private async upsertTenantSession(siteId: string, payload: NormalizedPayload) {
    const firstEvent = payload.events[0];
    await pg.query(
      `
        INSERT INTO sessions (
          site_id,
          visitor_id,
          session_id,
          started_at,
          landing_path,
          user_agent,
          referrer
        )
        VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7)
        ON CONFLICT (site_id, session_id)
        DO UPDATE SET
          visitor_id = COALESCE(EXCLUDED.visitor_id, sessions.visitor_id),
          ended_at = NOW(),
          exit_path = COALESCE(EXCLUDED.landing_path, sessions.exit_path)
      `,
      [
        siteId,
        payload.visitorId,
        payload.sessionId,
        firstEvent?.occurredAt ?? payload.sentAt,
        firstEvent?.path ?? null,
        truncateText(payload.context['userAgent'], 512) || null,
        truncateText(payload.context['referrer'], 2048) || null,
      ],
    );
  }

  private async insertRawEvent(
    siteId: string,
    siteKey: string,
    sessionId: string,
    visitorId: string | null,
    event: NormalizedSdkEvent,
    context: Record<string, unknown>,
  ) {
    await pg.query(
      `
        INSERT INTO sdk_events_raw (
          site_id,
          site_key,
          event_id,
          visitor_id,
          session_id,
          event_type,
          path,
          url,
          element_selector,
          element_text,
          element_tag,
          metadata,
          context,
          occurred_at,
          received_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13::jsonb, $14::timestamptz, NOW())
        ON CONFLICT (event_id) DO NOTHING
      `,
      [
        siteId,
        siteKey,
        event.eventId,
        visitorId,
        sessionId,
        event.type,
        event.path,
        event.url,
        event.metadata['selector'] ?? null,
        event.metadata['text'] ?? null,
        event.metadata['tag'] ?? null,
        JSON.stringify(event.metadata),
        JSON.stringify(context),
        event.occurredAt,
      ],
    );
  }

  private async insertEvent(
    siteKey: string,
    sessionId: string,
    visitorId: string | null,
    event: NormalizedSdkEvent,
    metadata: Record<string, unknown>,
    context: Record<string, unknown>,
  ) {
    await pg.query(
      `
        INSERT INTO sdk_events (
          event_id,
          site_key,
          visitor_id,
          session_id,
          page_id,
          event_type,
          event_name,
          url,
          path,
          title,
          occurred_at,
          metadata,
          context
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamptz, $12::jsonb, $13::jsonb)
        ON CONFLICT (event_id) DO NOTHING
      `,
      [
        event.eventId,
        siteKey,
        visitorId,
        sessionId,
        event.pageId,
        event.type,
        event.name ?? null,
        event.url,
        event.path,
        event.title,
        event.occurredAt,
        JSON.stringify(metadata),
        JSON.stringify(context),
      ],
    );
  }

  private async updateVisitIndexes(
    siteKey: string,
    sessionId: string,
    visitorId: string | null,
    event: NormalizedSdkEvent,
    metadata: Record<string, unknown>,
  ) {
    if (event.type === 'page_view' || event.type === 'route_change') {
      await pg.query(
        `
          INSERT INTO page_visits (site_key, visitor_id, session_id, page_id, url, path, title, entered_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz)
          ON CONFLICT (site_key, session_id, page_id) DO NOTHING
        `,
        [siteKey, visitorId, sessionId, event.pageId, event.url, event.path, event.title, event.occurredAt],
      );
      return;
    }

    if (event.type === 'page_leave') {
      await pg.query(
        `
          UPDATE page_visits
          SET
            left_at = $4::timestamptz,
            duration_ms = COALESCE($5, duration_ms),
            max_scroll_depth = GREATEST(COALESCE(max_scroll_depth, 0), COALESCE($6, 0))
          WHERE site_key = $1 AND session_id = $2 AND page_id = $3
        `,
        [
          siteKey,
          sessionId,
          event.pageId,
          event.occurredAt,
          asInt(metadata['durationMs'], 0) || null,
          asInt(metadata['maxScrollDepth'], 0) || null,
        ],
      );
      return;
    }

    if (event.type === 'scroll_depth') {
      await pg.query(
        `
          UPDATE page_visits
          SET max_scroll_depth = GREATEST(COALESCE(max_scroll_depth, 0), COALESCE($4, 0))
          WHERE site_key = $1 AND session_id = $2 AND page_id = $3
        `,
        [siteKey, sessionId, event.pageId, asInt(metadata['depth'], 0)],
      );
    }
  }

  private async getSummary(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        WITH scoped AS (
          SELECT *
          FROM sdk_events
          WHERE site_key = $1
            AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
        ),
        page_counts AS (
          SELECT session_id, COUNT(*) FILTER (WHERE event_type IN ('page_view', 'route_change')) as page_count
          FROM scoped
          GROUP BY session_id
        ),
        durations AS (
          SELECT AVG(
            COALESCE(
              (metadata->>'durationMs')::numeric / 1000,
              (metadata->>'duration')::numeric
            )
          ) as avg_time_seconds
          FROM scoped
          WHERE event_type IN ('page_leave', 'time_on_page')
        ),
        totals AS (
          SELECT
            COUNT(*)::int as total_events,
            COUNT(*) FILTER (WHERE event_type IN ('page_view', 'route_change'))::int as page_views,
            COUNT(DISTINCT COALESCE(visitor_id, session_id))::int as unique_visitors,
            COUNT(DISTINCT session_id)::int as sessions,
            COUNT(*) FILTER (WHERE event_type IN ('js_error', 'resource_error', 'api_error'))::int as errors,
            COUNT(*) FILTER (WHERE event_type = 'dead_click')::int as dead_clicks,
            COUNT(*) FILTER (WHERE event_type = 'rage_click')::int as rage_clicks,
            COUNT(*) FILTER (WHERE event_type = 'form_start')::int as form_starts,
            COUNT(*) FILTER (WHERE event_type = 'form_submit')::int as form_submits,
            COUNT(*) FILTER (WHERE event_type = 'form_abandon')::int as form_abandons
          FROM scoped
        ),
        bounce AS (
          SELECT
            COALESCE(
              ROUND(100 * AVG(CASE WHEN page_count <= 1 THEN 1 ELSE 0 END))::int,
              0
            ) as bounce_rate
          FROM page_counts
        )
        SELECT
          totals.*,
          COALESCE((SELECT ROUND(avg_time_seconds)::int FROM durations), 0) as avg_time_seconds,
          bounce.bounce_rate
        FROM totals, bounce
      `,
      [siteKey, rangeHours],
    );

    const activeUsersResult = await pg.query(
      `
        SELECT COUNT(DISTINCT COALESCE(visitor_id, session_id))::int as active_users
        FROM browser_sessions
        WHERE site_key = $1 AND last_seen_at >= NOW() - INTERVAL '5 minutes'
      `,
      [siteKey],
    );

    const row = result.rows[0] ?? {};
    const formStarts = asInt(row.form_starts);
    const formSubmits = asInt(row.form_submits);

    return {
      totalEvents: asInt(row.total_events),
      pageViews: asInt(row.page_views),
      uniqueVisitors: asInt(row.unique_visitors),
      sessions: asInt(row.sessions),
      activeUsers: asInt(activeUsersResult.rows[0]?.active_users),
      avgTimeSeconds: asInt(row.avg_time_seconds),
      bounceRate: asInt(row.bounce_rate),
      errors: asInt(row.errors),
      deadClicks: asInt(row.dead_clicks),
      rageClicks: asInt(row.rage_clicks),
      formStarts,
      formSubmits,
      formAbandons: asInt(row.form_abandons),
      formConversionRate: formStarts > 0 ? Math.round((formSubmits / formStarts) * 100) : 0,
    };
  }

  private async getTopPages(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        WITH views AS (
          SELECT path, title, COUNT(*)::int as views, COUNT(DISTINCT COALESCE(visitor_id, session_id))::int as visitors
          FROM sdk_events
          WHERE site_key = $1
            AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
            AND event_type IN ('page_view', 'route_change')
          GROUP BY path, title
        ),
        durations AS (
          SELECT path, ROUND(AVG((metadata->>'durationMs')::numeric / 1000))::int as avg_time_seconds
          FROM sdk_events
          WHERE site_key = $1
            AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
            AND event_type = 'page_leave'
          GROUP BY path
        )
        SELECT v.path, v.title, v.views, v.visitors, COALESCE(d.avg_time_seconds, 0) as avg_time_seconds
        FROM views v
        LEFT JOIN durations d ON d.path = v.path
        ORDER BY v.views DESC
        LIMIT 8
      `,
      [siteKey, rangeHours],
    );

    return result.rows.map((row) => ({
      path: row.path,
      title: row.title,
      views: asInt(row.views),
      visitors: asInt(row.visitors),
      avgTimeSeconds: asInt(row.avg_time_seconds),
    }));
  }

  private async getTopClicks(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        SELECT
          COALESCE(metadata->>'selector', metadata->>'id', metadata->>'tag', 'unknown') as selector,
          COALESCE(metadata->>'text', '') as text,
          COALESCE(metadata->>'tag', '') as tag,
          path,
          COUNT(*)::int as total
        FROM sdk_events
        WHERE site_key = $1
          AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          AND event_type = 'click'
        GROUP BY selector, text, tag, path
        ORDER BY total DESC
        LIMIT 10
      `,
      [siteKey, rangeHours],
    );

    return result.rows.map((row) => ({
      selector: row.selector,
      text: row.text,
      tag: row.tag,
      path: row.path,
      total: asInt(row.total),
    }));
  }

  private async getProblemInteractions(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        SELECT
          event_type,
          COALESCE(metadata->>'selector', 'unknown') as selector,
          COALESCE(metadata->>'text', '') as text,
          path,
          COUNT(*)::int as total
        FROM sdk_events
        WHERE site_key = $1
          AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          AND event_type IN ('dead_click', 'rage_click')
        GROUP BY event_type, selector, text, path
        ORDER BY total DESC
        LIMIT 10
      `,
      [siteKey, rangeHours],
    );

    return result.rows.map((row) => ({
      type: row.event_type,
      selector: row.selector,
      text: row.text,
      path: row.path,
      total: asInt(row.total),
    }));
  }

  private async getFormMetrics(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        SELECT
          path,
          COALESCE(metadata->>'formId', metadata->>'id', metadata->>'selector', 'form') as form_id,
          COUNT(*) FILTER (WHERE event_type = 'form_start')::int as starts,
          COUNT(*) FILTER (WHERE event_type = 'form_submit')::int as submits,
          COUNT(*) FILTER (WHERE event_type = 'form_abandon')::int as abandons
        FROM sdk_events
        WHERE site_key = $1
          AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          AND event_type IN ('form_start', 'form_submit', 'form_abandon')
        GROUP BY path, form_id
        ORDER BY starts DESC, abandons DESC
        LIMIT 10
      `,
      [siteKey, rangeHours],
    );

    return result.rows.map((row) => {
      const starts = asInt(row.starts);
      const submits = asInt(row.submits);
      return {
        path: row.path,
        formId: row.form_id,
        starts,
        submits,
        abandons: asInt(row.abandons),
        conversionRate: starts > 0 ? Math.round((submits / starts) * 100) : 0,
      };
    });
  }

  private async getErrors(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        SELECT
          event_type,
          COALESCE(metadata->>'message', metadata->>'source', 'Erro sem mensagem') as message,
          path,
          COUNT(*)::int as total,
          MAX(occurred_at) as last_seen_at
        FROM sdk_events
        WHERE site_key = $1
          AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          AND event_type IN ('js_error', 'resource_error', 'api_error')
        GROUP BY event_type, message, path
        ORDER BY total DESC, last_seen_at DESC
        LIMIT 10
      `,
      [siteKey, rangeHours],
    );

    return result.rows.map((row) => ({
      type: row.event_type,
      message: row.message,
      path: row.path,
      total: asInt(row.total),
      lastSeenAt: row.last_seen_at,
    }));
  }

  private async getWebVitals(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        SELECT
          LOWER(metadata->>'name') as name,
          ROUND(AVG((metadata->>'value')::numeric), 2)::float as value,
          COUNT(*)::int as samples
        FROM sdk_events
        WHERE site_key = $1
          AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          AND event_type = 'web_vital'
          AND metadata ? 'name'
          AND metadata ? 'value'
        GROUP BY name
      `,
      [siteKey, rangeHours],
    );

    return result.rows.reduce<Record<string, { value: number; samples: number }>>((acc, row) => {
      acc[row.name] = {
        value: asNumber(row.value),
        samples: asInt(row.samples),
      };
      return acc;
    }, {});
  }

  private async getDevices(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        SELECT
          COALESCE(context->>'deviceType', 'unknown') as device_type,
          COUNT(DISTINCT COALESCE(visitor_id, session_id))::int as visitors
        FROM sdk_events
        WHERE site_key = $1
          AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
        GROUP BY device_type
        ORDER BY visitors DESC
      `,
      [siteKey, rangeHours],
    );

    return result.rows.map((row) => ({
      deviceType: row.device_type,
      visitors: asInt(row.visitors),
    }));
  }

  private async getTrafficSources(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        SELECT
          COALESCE(NULLIF(context->'utm'->>'source', ''), NULLIF(context->>'referrerHost', ''), 'direct') as source,
          COUNT(DISTINCT COALESCE(visitor_id, session_id))::int as visitors,
          COUNT(*) FILTER (WHERE event_type IN ('page_view', 'route_change'))::int as page_views
        FROM sdk_events
        WHERE site_key = $1
          AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
        GROUP BY source
        ORDER BY visitors DESC, page_views DESC
        LIMIT 8
      `,
      [siteKey, rangeHours],
    );

    return result.rows.map((row) => ({
      source: row.source,
      visitors: asInt(row.visitors),
      pageViews: asInt(row.page_views),
    }));
  }
}
