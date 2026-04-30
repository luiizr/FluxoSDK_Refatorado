import { pg } from '../main';
import type { ReceiveSdkEventsPayload, SdkEvent } from '../entities/sdk.entities';

type DashboardScope = {
  siteKey: string;
  userId?: string;
  rangeHours?: number;
};

const MAX_EVENTS_PER_REQUEST = 100;
const DEFAULT_RANGE_HOURS = 24;

function asNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function asInt(value: unknown, fallback = 0) {
  return Math.round(asNumber(value, fallback));
}

function safeJson(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function normalizeRangeHours(value?: number) {
  if (!value || !Number.isFinite(value)) return DEFAULT_RANGE_HOURS;
  return Math.min(Math.max(Math.round(value), 1), 24 * 90);
}

export class SdkService {
  async receiveEvents(input: ReceiveSdkEventsPayload) {
    const { siteKey, sessionId, sentAt, events } = input;

    if (!siteKey) throw new Error('siteKey e obrigatorio');
    if (!sessionId) throw new Error('sessionId e obrigatorio');
    if (!Array.isArray(events) || events.length === 0) {
      throw new Error('events deve ser um array com pelo menos um item');
    }

    const acceptedEvents = events.slice(0, MAX_EVENTS_PER_REQUEST);
    const keyResult = await pg.query(
      `
        SELECT k.active, k.site_id, s.active as site_active
        FROM site_keys k
        JOIN sites s ON s.id = k.site_id
        WHERE k.public_key = $1
      `,
      [siteKey],
    );

    if (keyResult.rowCount === 0) {
      throw new Error('siteKey invalido ou inexistente');
    }

    if (!keyResult.rows[0].active || !keyResult.rows[0].site_active) {
      throw new Error('siteKey ou site esta desativado');
    }

    const payloadContext = safeJson(input.context);
    const visitorId = input.visitorId || null;
    const userIdentifier = input.userIdentifier || null;

    acceptedEvents.forEach((event) => this.validateEvent(event));

    await pg.query('BEGIN');
    try {
      await this.upsertSession(siteKey, sessionId, visitorId, userIdentifier, payloadContext);

      for (const event of acceptedEvents) {
        const metadata = safeJson(event.metadata);
        const context = { ...payloadContext, ...safeJson(event.context) };
        await this.insertEvent(siteKey, sessionId, visitorId, event, metadata, context);
        await this.updateVisitIndexes(siteKey, sessionId, visitorId, event, metadata);

        if (event.type === 'identify') {
          await this.updateSessionIdentity(siteKey, sessionId, String(metadata['userId'] ?? userIdentifier ?? ''));
        }
      }

      await pg.query('COMMIT');
    } catch (error) {
      await pg.query('ROLLBACK');
      throw error;
    }

    return {
      siteKey,
      sessionId,
      sentAt: sentAt ?? new Date().toISOString(),
      totalReceivedEvents: acceptedEvents.length,
      droppedEvents: Math.max(events.length - acceptedEvents.length, 0),
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
    const [
      summary,
      topPages,
      topClicks,
      problemInteractions,
      formMetrics,
      errors,
      webVitals,
      devices,
      sources,
      sessionMetrics,
      navigationMetrics,
      engagementMetrics,
      funnelMetrics,
      flowMetrics,
      performanceMetrics,
      contextMetrics,
      customEvents,
    ] = await Promise.all([
      this.getSummary(siteKey, rangeHours),
      this.getTopPages(siteKey, rangeHours),
      this.getTopClicks(siteKey, rangeHours),
      this.getProblemInteractions(siteKey, rangeHours),
      this.getFormMetrics(siteKey, rangeHours),
      this.getErrors(siteKey, rangeHours),
      this.getWebVitals(siteKey, rangeHours),
      this.getDevices(siteKey, rangeHours),
      this.getTrafficSources(siteKey, rangeHours),
      this.getSessionMetrics(siteKey, rangeHours),
      this.getNavigationMetrics(siteKey, rangeHours),
      this.getEngagementMetrics(siteKey, rangeHours),
      this.getFunnelMetrics(siteKey, rangeHours),
      this.getFlowMetrics(siteKey, rangeHours),
      this.getPerformanceMetrics(siteKey, rangeHours),
      this.getContextMetrics(siteKey, rangeHours),
      this.getCustomEvents(siteKey, rangeHours),
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
      sessionMetrics,
      navigationMetrics,
      engagementMetrics,
      funnelMetrics,
      flowMetrics,
      performanceMetrics,
      contextMetrics,
      customEvents,
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

  private validateEvent(event: SdkEvent) {
    if (!event.eventId) throw new Error('eventId e obrigatorio');
    if (!event.type) throw new Error('type e obrigatorio');
    if (!event.pageId) throw new Error('pageId e obrigatorio');
    if (!event.url) throw new Error('url e obrigatorio');
    if (!event.path) throw new Error('path e obrigatorio');
    if (!event.title && event.title !== '') throw new Error('title e obrigatorio');
    if (!event.occurredAt) throw new Error('occurredAt e obrigatorio');
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

  private async insertEvent(
    siteKey: string,
    sessionId: string,
    visitorId: string | null,
    event: SdkEvent,
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
    event: SdkEvent,
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
          COUNT(*) FILTER (WHERE event_type = 'form_abandon')::int as abandons,
          COUNT(*) FILTER (WHERE event_type = 'field_error')::int as field_errors,
          ROUND(AVG((metadata->>'fillTimeMs')::numeric) FILTER (WHERE event_type = 'form_submit'), 2)::float as avg_fill_time_ms
        FROM sdk_events
        WHERE site_key = $1
          AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          AND event_type IN ('form_start', 'form_submit', 'form_abandon', 'field_error')
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
        fieldErrors: asInt(row.field_errors),
        avgFillTimeMs: asNumber(row.avg_fill_time_ms),
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

  private async getSessionMetrics(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        WITH sessions AS (
          SELECT
            session_id,
            COALESCE(visitor_id, session_id) as visitor_key,
            MIN(occurred_at) as first_seen,
            MAX(occurred_at) as last_seen,
            COUNT(*)::int as events_per_session,
            COUNT(*) FILTER (WHERE event_type IN ('page_view', 'route_change'))::int as pages_per_session
          FROM sdk_events
          WHERE site_key = $1
            AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          GROUP BY session_id, visitor_key
        ),
        visitors AS (
          SELECT visitor_key, COUNT(*)::int as sessions_count, MIN(first_seen) as first_seen
          FROM sessions
          GROUP BY visitor_key
        )
        SELECT
          COUNT(*)::int as sessions,
          COUNT(DISTINCT sessions.visitor_key)::int as unique_visitors,
          COUNT(*) FILTER (WHERE visitors.sessions_count = 1)::int as new_visitors,
          COUNT(*) FILTER (WHERE visitors.sessions_count > 1)::int as returning_visitors,
          COALESCE(ROUND(AVG(EXTRACT(EPOCH FROM (sessions.last_seen - sessions.first_seen)))), 0)::int as avg_session_duration_seconds,
          COALESCE(ROUND(AVG(sessions.pages_per_session::numeric), 2), 0)::float as pages_per_session,
          COALESCE(ROUND(AVG(sessions.events_per_session::numeric), 2), 0)::float as events_per_session
        FROM sessions
        LEFT JOIN visitors ON visitors.visitor_key = sessions.visitor_key
      `,
      [siteKey, rangeHours],
    );

    const row = result.rows[0] ?? {};
    return {
      sessions: asInt(row.sessions),
      uniqueVisitors: asInt(row.unique_visitors),
      newVisitors: asInt(row.new_visitors),
      returningVisitors: asInt(row.returning_visitors),
      avgSessionDurationSeconds: asInt(row.avg_session_duration_seconds),
      pagesPerSession: asNumber(row.pages_per_session),
      eventsPerSession: asNumber(row.events_per_session),
    };
  }

  private async getNavigationMetrics(siteKey: string, rangeHours: number) {
    const [entryPages, exitPages, topExitRates, commonRoutes] = await Promise.all([
      pg.query(
        `
          WITH ranked AS (
            SELECT
              session_id,
              path,
              ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY entered_at ASC) as rn
            FROM page_visits
            WHERE site_key = $1
              AND entered_at >= NOW() - ($2::int * INTERVAL '1 hour')
          )
          SELECT path, COUNT(*)::int as total
          FROM ranked
          WHERE rn = 1
          GROUP BY path
          ORDER BY total DESC
          LIMIT 10
        `,
        [siteKey, rangeHours],
      ),
      pg.query(
        `
          WITH ranked AS (
            SELECT
              session_id,
              path,
              ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY entered_at DESC) as rn
            FROM page_visits
            WHERE site_key = $1
              AND entered_at >= NOW() - ($2::int * INTERVAL '1 hour')
          )
          SELECT path, COUNT(*)::int as total
          FROM ranked
          WHERE rn = 1
          GROUP BY path
          ORDER BY total DESC
          LIMIT 10
        `,
        [siteKey, rangeHours],
      ),
      pg.query(
        `
          WITH sessions_by_path AS (
            SELECT path, COUNT(DISTINCT session_id)::int as sessions
            FROM page_visits
            WHERE site_key = $1
              AND entered_at >= NOW() - ($2::int * INTERVAL '1 hour')
            GROUP BY path
          ),
          exits_by_path AS (
            SELECT path, COUNT(*)::int as exits
            FROM (
              SELECT session_id, path, ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY entered_at DESC) as rn
              FROM page_visits
              WHERE site_key = $1
                AND entered_at >= NOW() - ($2::int * INTERVAL '1 hour')
            ) x
            WHERE rn = 1
            GROUP BY path
          )
          SELECT
            s.path,
            s.sessions,
            COALESCE(e.exits, 0)::int as exits,
            CASE WHEN s.sessions > 0 THEN ROUND((COALESCE(e.exits, 0)::numeric / s.sessions) * 100, 2) ELSE 0 END::float as exit_rate
          FROM sessions_by_path s
          LEFT JOIN exits_by_path e ON e.path = s.path
          ORDER BY exit_rate DESC, exits DESC
          LIMIT 10
        `,
        [siteKey, rangeHours],
      ),
      pg.query(
        `
          WITH ordered AS (
            SELECT
              session_id,
              path,
              LEAD(path) OVER (PARTITION BY session_id ORDER BY entered_at ASC) as next_path
            FROM page_visits
            WHERE site_key = $1
              AND entered_at >= NOW() - ($2::int * INTERVAL '1 hour')
          )
          SELECT path as from_path, next_path as to_path, COUNT(*)::int as total
          FROM ordered
          WHERE next_path IS NOT NULL
          GROUP BY from_path, to_path
          ORDER BY total DESC
          LIMIT 10
        `,
        [siteKey, rangeHours],
      ),
    ]);

    return {
      entryPages: entryPages.rows.map((row) => ({ path: row.path, total: asInt(row.total) })),
      exitPages: exitPages.rows.map((row) => ({ path: row.path, total: asInt(row.total) })),
      topExitRates: topExitRates.rows.map((row) => ({
        path: row.path,
        sessions: asInt(row.sessions),
        exits: asInt(row.exits),
        exitRate: asNumber(row.exit_rate),
      })),
      commonRoutes: commonRoutes.rows.map((row) => ({
        from: row.from_path,
        to: row.to_path,
        total: asInt(row.total),
      })),
    };
  }

  private async getEngagementMetrics(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        WITH sessions AS (
          SELECT
            session_id,
            COALESCE(visitor_id, session_id) as visitor_key,
            COUNT(*)::int as events_per_session,
            COUNT(*) FILTER (WHERE event_type = 'click')::int as clicks_per_session,
            MAX(COALESCE((metadata->>'maxScrollDepth')::int, (metadata->>'depth')::int, 0))::int as max_scroll
          FROM sdk_events
          WHERE site_key = $1
            AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          GROUP BY session_id, visitor_key
        )
        SELECT
          COALESCE(ROUND(AVG(clicks_per_session::numeric), 2), 0)::float as clicks_per_session,
          COALESCE(ROUND(AVG(events_per_session::numeric), 2), 0)::float as events_per_session,
          COALESCE(ROUND(AVG(max_scroll::numeric), 2), 0)::float as avg_scroll_depth,
          COUNT(DISTINCT visitor_key) FILTER (
            WHERE events_per_session >= 3 OR clicks_per_session >= 2 OR max_scroll >= 50
          )::int as engaged_users
        FROM sessions
      `,
      [siteKey, rangeHours],
    );

    const row = result.rows[0] ?? {};
    return {
      clicksPerSession: asNumber(row.clicks_per_session),
      eventsPerSession: asNumber(row.events_per_session),
      avgScrollDepth: asNumber(row.avg_scroll_depth),
      engagedUsers: asInt(row.engaged_users),
    };
  }

  private async getFunnelMetrics(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        WITH funnel_events AS (
          SELECT
            session_id,
            COALESCE(NULLIF(metadata->>'funnel', ''), 'default') as funnel_name,
            COALESCE(NULLIF(metadata->>'step', ''), COALESCE(NULLIF(event_name, ''), event_type)) as step_name,
            MIN(occurred_at) as first_at
          FROM sdk_events
          WHERE site_key = $1
            AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
            AND (
              event_type IN ('form_start', 'form_submit', 'form_abandon', 'custom')
              OR metadata ? 'funnel'
            )
          GROUP BY session_id, funnel_name, step_name
        )
        SELECT funnel_name, step_name, COUNT(DISTINCT session_id)::int as sessions, MIN(first_at) as first_seen
        FROM funnel_events
        GROUP BY funnel_name, step_name
        ORDER BY funnel_name, first_seen ASC
      `,
      [siteKey, rangeHours],
    );

    const groups = new Map<string, Array<{ name: string; sessions: number }>>();
    result.rows.forEach((row) => {
      const list = groups.get(row.funnel_name) ?? [];
      list.push({ name: row.step_name, sessions: asInt(row.sessions) });
      groups.set(row.funnel_name, list);
    });

    return Array.from(groups.entries()).map(([name, steps]) => {
      const starts = steps[0]?.sessions ?? 0;
      const conversions = steps[steps.length - 1]?.sessions ?? 0;
      return {
        name,
        starts,
        conversions,
        conversionRate: starts > 0 ? Math.round((conversions / starts) * 100) : 0,
        steps: steps.map((step, index) => ({
          order: index + 1,
          name: step.name,
          sessions: step.sessions,
          dropOff: index > 0 ? Math.max((steps[index - 1]?.sessions ?? 0) - step.sessions, 0) : 0,
        })),
      };
    });
  }

  private async getFlowMetrics(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        WITH ordered AS (
          SELECT
            session_id,
            path,
            LEAD(path) OVER (PARTITION BY session_id ORDER BY entered_at ASC) as next_path
          FROM page_visits
          WHERE site_key = $1
            AND entered_at >= NOW() - ($2::int * INTERVAL '1 hour')
        )
        SELECT path as from_path, next_path as to_path, COUNT(*)::int as total
        FROM ordered
        WHERE next_path IS NOT NULL
        GROUP BY from_path, to_path
        ORDER BY total DESC
        LIMIT 20
      `,
      [siteKey, rangeHours],
    );

    return result.rows.map((row) => ({
      from: row.from_path,
      to: row.to_path,
      total: asInt(row.total),
    }));
  }

  private async getPerformanceMetrics(siteKey: string, rangeHours: number) {
    const base = await pg.query(
      `
        SELECT
          ROUND(AVG((metadata->>'ttfb')::numeric), 2)::float as ttfb,
          ROUND(AVG((metadata->>'load')::numeric), 2)::float as load,
          ROUND(AVG((metadata->>'domContentLoaded')::numeric), 2)::float as dom_content_loaded
        FROM sdk_events
        WHERE site_key = $1
          AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          AND event_type = 'performance'
      `,
      [siteKey, rangeHours],
    );

    const slowPages = await pg.query(
      `
        SELECT path, ROUND(AVG((metadata->>'load')::numeric), 2)::float as avg_load, COUNT(*)::int as samples
        FROM sdk_events
        WHERE site_key = $1
          AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          AND event_type = 'performance'
          AND metadata ? 'load'
        GROUP BY path
        ORDER BY avg_load DESC
        LIMIT 8
      `,
      [siteKey, rangeHours],
    );

    const row = base.rows[0] ?? {};
    return {
      ttfb: asNumber(row.ttfb),
      load: asNumber(row.load),
      domContentLoaded: asNumber(row.dom_content_loaded),
      slowPages: slowPages.rows.map((item) => ({
        path: item.path,
        avgLoad: asNumber(item.avg_load),
        samples: asInt(item.samples),
      })),
    };
  }

  private async getContextMetrics(siteKey: string, rangeHours: number) {
    const [browsers, os, languages, timezones] = await Promise.all([
      pg.query(
        `
          SELECT COALESCE(context->>'browser', 'unknown') as label, COUNT(*)::int as total
          FROM sdk_events
          WHERE site_key = $1
            AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          GROUP BY label
          ORDER BY total DESC
          LIMIT 8
        `,
        [siteKey, rangeHours],
      ),
      pg.query(
        `
          SELECT COALESCE(context->>'os', 'unknown') as label, COUNT(*)::int as total
          FROM sdk_events
          WHERE site_key = $1
            AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          GROUP BY label
          ORDER BY total DESC
          LIMIT 8
        `,
        [siteKey, rangeHours],
      ),
      pg.query(
        `
          SELECT COALESCE(context->>'language', 'unknown') as label, COUNT(*)::int as total
          FROM sdk_events
          WHERE site_key = $1
            AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          GROUP BY label
          ORDER BY total DESC
          LIMIT 8
        `,
        [siteKey, rangeHours],
      ),
      pg.query(
        `
          SELECT COALESCE(context->>'timezone', 'unknown') as label, COUNT(*)::int as total
          FROM sdk_events
          WHERE site_key = $1
            AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          GROUP BY label
          ORDER BY total DESC
          LIMIT 8
        `,
        [siteKey, rangeHours],
      ),
    ]);

    const mapRows = (rows: Array<{ label: string; total: unknown }>) =>
      rows.map((row) => ({ label: row.label, total: asInt(row.total) }));

    return {
      browsers: mapRows(browsers.rows),
      os: mapRows(os.rows),
      languages: mapRows(languages.rows),
      timezones: mapRows(timezones.rows),
    };
  }

  private async getCustomEvents(siteKey: string, rangeHours: number) {
    const result = await pg.query(
      `
        SELECT COALESCE(NULLIF(event_name, ''), 'custom_event') as event_name, COUNT(*)::int as total
        FROM sdk_events
        WHERE site_key = $1
          AND occurred_at >= NOW() - ($2::int * INTERVAL '1 hour')
          AND event_type = 'custom'
        GROUP BY event_name
        ORDER BY total DESC
        LIMIT 20
      `,
      [siteKey, rangeHours],
    );

    return result.rows.map((row) => ({
      name: row.event_name,
      total: asInt(row.total),
    }));
  }
}
