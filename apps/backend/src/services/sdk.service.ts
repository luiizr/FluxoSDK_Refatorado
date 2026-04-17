import { pg } from '../main';

type SdkEvent = {
  eventId?: string;
  type?: string;
  pageId?: string;
  url?: string;
  path?: string;
  title?: string;
  occurredAt?: string;
  metadata?: Record<string, unknown>;
};

type ReceiveSdkEventsInput = {
  siteKey?: string;
  sessionId?: string;
  sentAt?: string;
  events?: SdkEvent[];
};

export class SdkService {
  async receiveEvents(input: ReceiveSdkEventsInput) {
    const { siteKey, sessionId, sentAt, events } = input;

    console.log(`[SDK_LOG] Recebendo ${events?.length} eventos. Session: ${sessionId}`);

    if (!siteKey) throw new Error('siteKey é obrigatório');
    if (!sessionId) throw new Error('sessionId é obrigatório');
    if (!Array.isArray(events) || events.length === 0) {
      throw new Error('events deve ser um array com pelo menos um item');
    }

    await this.upsertSessionWithEvents(siteKey, sessionId, events);

    return {
      siteKey,
      sessionId,
      sentAt: sentAt ?? new Date().toISOString(),
      totalReceivedEvents: events.length,
    };
  }

  async listRecentEvents(limit = 20, siteKey?: string) {
    const filters = [];
    const values: any[] = [limit];

    if (siteKey) {
      filters.push(`s.site_key = $2`);
      values.push(siteKey);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const result = await pg.query(
      `
        SELECT
          s.site_key,
          s.session_id,
          e->>'eventId' as event_id,
          e->>'type' as event_type,
          e->>'url' as url,
          e->>'path' as path,
          e->>'title' as title,
          e->>'occurredAt' as occurred_at,
          e->'metadata' as metadata,
          s.created_at
        FROM browser_sessions s,
        LATERAL jsonb_array_elements(s.events) e
        ${whereClause}
        ORDER BY (e->>'occurredAt')::timestamptz DESC
        LIMIT $1
      `,
      values
    );

    return result.rows;
  }

  async getStats(siteKey: string) {
    if (!siteKey) throw new Error('siteKey é obrigatório');

    // Usuários Ativos: Sessões ativas nos últimos 5 minutos (ou seja, 5 * 60 = 300 segundos)
    const activeUsersResult = await pg.query(`
      SELECT COUNT(DISTINCT session_id) as active_users
      FROM browser_sessions
      WHERE site_key = $1 AND last_seen_at >= NOW() - INTERVAL '5 minutes'
    `, [siteKey]);

    const activeUsers = parseInt(activeUsersResult.rows[0].active_users, 10);

    // Tempo médio por página em segundos
    const timeOnPageResult = await pg.query(`
      SELECT AVG(CAST(e->'metadata'->>'duration' AS numeric)) as avg_time
      FROM browser_sessions s,
      LATERAL jsonb_array_elements(s.events) e
      WHERE s.site_key = $1 AND e->>'type' = 'time_on_page'
    `, [siteKey]);

    const avgTimeRaw = timeOnPageResult.rows[0].avg_time;
    const avgTimeSeconds = avgTimeRaw ? Math.round(parseFloat(avgTimeRaw)) : 0;

    return {
      activeUsers,
      avgTimeSeconds
    };
  }

  private validateEvent(event: SdkEvent) {
    if (!event.eventId) throw new Error('eventId é obrigatório');
    if (!event.type) throw new Error('type é obrigatório');
    if (!event.pageId) throw new Error('pageId é obrigatório');
    if (!event.url) throw new Error('url é obrigatório');
    if (!event.path) throw new Error('path é obrigatório');
    if (!event.title) throw new Error('title é obrigatório');
  }

  private async upsertSessionWithEvents(siteKey: string, sessionId: string, newEvents: SdkEvent[]) {
    // Valida todos antes de inserir
    newEvents.forEach(e => this.validateEvent(e));
    
    await pg.query(
      `
        INSERT INTO browser_sessions (site_key, session_id, events)
        VALUES ($1, $2, $3::jsonb)
        ON CONFLICT (site_key, session_id)
        DO UPDATE SET 
          last_seen_at = NOW(),
          events = COALESCE(browser_sessions.events, '[]'::jsonb) || EXCLUDED.events
      `,
      [siteKey, sessionId, JSON.stringify(newEvents)]
    );
    console.log(`[SDK_LOG] ${newEvents.length} eventos agrupados salvos na sessão ${sessionId}`);
  }
}
