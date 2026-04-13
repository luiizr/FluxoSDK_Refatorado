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

    if (!siteKey) throw new Error('siteKey é obrigatório');
    if (!sessionId) throw new Error('sessionId é obrigatório');
    if (!Array.isArray(events) || events.length === 0) {
      throw new Error('events deve ser um array com pelo menos um item');
    }

    await this.upsertBrowserSession(siteKey, sessionId);

    for (const event of events) {
      this.validateEvent(event);
      await this.upsertPageVisit(sessionId, event);
      await this.insertSdkEvent(siteKey, sessionId, event);
    }

    return {
      siteKey,
      sessionId,
      sentAt: sentAt ?? new Date().toISOString(),
      totalReceivedEvents: events.length,
    };
  }

  async listRecentEvents(limit = 20) {
    const result = await pg.query(
      `
        SELECT
          event_id,
          site_key,
          session_id,
          page_id,
          event_type,
          url,
          path,
          title,
          occurred_at,
          metadata,
          created_at
        FROM sdk_events
        ORDER BY created_at DESC
        LIMIT $1
      `,
      [limit],
    );

    return result.rows;
  }

  private validateEvent(event: SdkEvent) {
    if (!event.eventId) throw new Error('eventId é obrigatório');
    if (!event.type) throw new Error('type é obrigatório');
    if (!event.pageId) throw new Error('pageId é obrigatório');
    if (!event.url) throw new Error('url é obrigatório');
    if (!event.path) throw new Error('path é obrigatório');
    if (!event.title) throw new Error('title é obrigatório');
  }

  private async upsertBrowserSession(siteKey: string, sessionId: string) {
    await pg.query(
      `
        INSERT INTO browser_sessions (site_key, session_id)
        VALUES ($1, $2)
        ON CONFLICT (site_key, session_id)
        DO UPDATE SET last_seen_at = NOW()
      `,
      [siteKey, sessionId],
    );
  }

  private async upsertPageVisit(sessionId: string, event: SdkEvent) {
    await pg.query(
      `
        INSERT INTO page_visits (session_id, page_id, url, path, title)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (session_id, page_id)
        DO UPDATE SET
          url = EXCLUDED.url,
          path = EXCLUDED.path,
          title = EXCLUDED.title
      `,
      [sessionId, event.pageId, event.url, event.path, event.title],
    );
  }

  private async insertSdkEvent(siteKey: string, sessionId: string, event: SdkEvent) {
    await pg.query(
      `
        INSERT INTO sdk_events (
          event_id,
          site_key,
          session_id,
          page_id,
          event_type,
          url,
          path,
          title,
          occurred_at,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
        ON CONFLICT (event_id) DO NOTHING
      `,
      [
        event.eventId,
        siteKey,
        sessionId,
        event.pageId,
        event.type,
        event.url,
        event.path,
        event.title,
        event.occurredAt ?? new Date().toISOString(),
        JSON.stringify(event.metadata ?? {}),
      ],
    );
  }
}
