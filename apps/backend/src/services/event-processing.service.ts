import { pg } from '../main';

export type ProcessableEvent = {
  eventId: string;
  type: string;
  path: string;
  metadata: Record<string, unknown>;
  occurredAt: string;
};

type IntentRuleRow = {
  id: string;
  name: string;
  intent_type: string;
  conditions: Record<string, unknown>;
  weight: string | number;
};

function readConditionValue(event: ProcessableEvent, field: string) {
  if (field === 'path') return event.path;
  if (field === 'event_type') return event.type;
  if (field === 'selector' || field === 'element_selector') return event.metadata['selector'];
  if (field === 'text' || field === 'element_text') return event.metadata['text'];
  if (field === 'tag' || field === 'element_tag') return event.metadata['tag'];
  return event.metadata[field];
}

function matchesSingleCondition(actual: unknown, expected: unknown) {
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    const condition = expected as Record<string, unknown>;
    if (typeof condition.equals === 'string') return String(actual ?? '') === condition.equals;
    if (typeof condition.contains === 'string') return String(actual ?? '').includes(condition.contains);
    if (Array.isArray(condition.in)) return condition.in.map(String).includes(String(actual ?? ''));
    return false;
  }

  return String(actual ?? '') === String(expected ?? '');
}

function matchesConditions(event: ProcessableEvent, conditions: Record<string, unknown>) {
  return Object.entries(conditions).every(([field, expected]) =>
    matchesSingleCondition(readConditionValue(event, field), expected),
  );
}

function dayStart(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString();
}

export class EventProcessingService {
  async processAcceptedEvent(siteId: string, visitorId: string | null, sessionId: string, event: ProcessableEvent) {
    await this.detectIntents(siteId, visitorId, sessionId, event);
    await this.updateAggregates(siteId, event);
  }

  private async detectIntents(
    siteId: string,
    visitorId: string | null,
    sessionId: string,
    event: ProcessableEvent,
  ) {
    const rules = await pg.query<IntentRuleRow>(
      `
        SELECT id, name, intent_type, conditions, weight
        FROM intent_rules
        WHERE site_id = $1
          AND event_type = $2
          AND is_active = true
      `,
      [siteId, event.type],
    );

    for (const rule of rules.rows) {
      if (!matchesConditions(event, rule.conditions ?? {})) continue;

      await pg.query(
        `
          INSERT INTO detected_intents (
            site_id, visitor_id, session_id, intent_type, rule_id, score, metadata, detected_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::timestamptz)
        `,
        [
          siteId,
          visitorId,
          sessionId,
          rule.intent_type,
          rule.id,
          Number(rule.weight) || 1,
          JSON.stringify({ eventId: event.eventId, ruleName: rule.name }),
          event.occurredAt,
        ],
      );
    }
  }

  private async updateAggregates(siteId: string, event: ProcessableEvent) {
    const periodStart = dayStart(event.occurredAt);
    const aggregates = [
      {
        metricKey: 'event_count',
        dimensions: { event_type: event.type },
      },
      {
        metricKey: 'event_count_by_path',
        dimensions: { event_type: event.type, path: event.path },
      },
    ];

    for (const aggregate of aggregates) {
      await pg.query(
        `
          INSERT INTO metric_aggregates (site_id, metric_key, dimensions, period, period_start, value)
          VALUES ($1, $2, $3::jsonb, 'day', $4::timestamptz, 1)
          ON CONFLICT (site_id, metric_key, dimensions, period, period_start)
          DO UPDATE SET value = metric_aggregates.value + 1, updated_at = NOW()
        `,
        [siteId, aggregate.metricKey, JSON.stringify(aggregate.dimensions), periodStart],
      );
    }
  }
}
