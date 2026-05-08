import { pg } from '../main';
import type {
  KpiChartType,
  KpiInput,
  MetricAggregation,
  MetricDefinitionInput,
  MetricFilter,
  MetricSource,
} from '../entities/kpi.entities';

type SourceConfig = {
  from: string;
  sitePredicate: string;
  dateColumn: string;
  fields: Record<string, string>;
  numericFields: Set<string>;
};

type MetricDefinitionRow = {
  id: string;
  site_id: string;
  name: string;
  description: string | null;
  source: MetricSource;
  event_type: string | null;
  aggregation: MetricAggregation;
  field: string | null;
  filters: MetricFilter[] | null;
  group_by: string[] | null;
};

const AGGREGATIONS = new Set<MetricAggregation>(['count', 'sum', 'avg', 'min', 'max', 'unique_count']);
const CHART_TYPES = new Set<KpiChartType>(['number', 'line', 'bar', 'pie', 'table']);
const FILTER_OPERATORS = new Set(['eq', 'neq', 'contains', 'in', 'gt', 'gte', 'lt', 'lte']);

const SOURCES: Record<MetricSource, SourceConfig> = {
  events: {
    from: 'sdk_events e JOIN site_keys sk ON sk.public_key = e.site_key',
    sitePredicate: 'sk.site_id = $1',
    dateColumn: 'e.occurred_at',
    fields: {
      event_type: 'e.event_type',
      path: 'e.path',
      element_selector: "e.metadata->>'selector'",
      occurred_at: 'e.occurred_at',
      visitor_id: 'e.visitor_id',
      session_id: 'e.session_id',
    },
    numericFields: new Set(),
  },
  sessions: {
    from: 'sessions s',
    sitePredicate: 's.site_id = $1',
    dateColumn: 's.started_at',
    fields: {
      session_id: 's.session_id',
      visitor_id: 's.visitor_id',
      started_at: 's.started_at',
      ended_at: 's.ended_at',
      landing_path: 's.landing_path',
      exit_path: 's.exit_path',
    },
    numericFields: new Set(),
  },
  detected_intents: {
    from: 'detected_intents di',
    sitePredicate: 'di.site_id = $1',
    dateColumn: 'di.detected_at',
    fields: {
      intent_type: 'di.intent_type',
      score: 'di.score',
      detected_at: 'di.detected_at',
      visitor_id: 'di.visitor_id',
      session_id: 'di.session_id',
    },
    numericFields: new Set(['score']),
  },
  metric_aggregates: {
    from: 'metric_aggregates ma',
    sitePredicate: 'ma.site_id = $1',
    dateColumn: 'ma.period_start',
    fields: {
      metric_key: 'ma.metric_key',
      period: 'ma.period',
      period_start: 'ma.period_start',
      value: 'ma.value',
    },
    numericFields: new Set(['value']),
  },
};

function normalizeString(value: unknown, maxLength = 256) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, maxLength);
}

function normalizeFilters(input: unknown): MetricFilter[] {
  if (!Array.isArray(input)) return [];

  return input.slice(0, 20).map((filter) => ({
    field: normalizeString(filter?.field, 80),
    operator: FILTER_OPERATORS.has(filter?.operator) ? filter.operator : 'eq',
    value: filter?.value,
  }));
}

function normalizeGroupBy(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.slice(0, 3).map((field) => normalizeString(field, 80)).filter(Boolean);
}

function jsonObject(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

export class KpiService {
  async createMetricDefinition(siteId: string, userId: string, input: MetricDefinitionInput) {
    await this.assertSiteAccess(siteId, userId);
    const metric = this.validateMetricDefinition(input);

    const result = await pg.query(
      `
        INSERT INTO metric_definitions (
          site_id, name, description, source, event_type, aggregation, field, filters, group_by, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10)
        RETURNING *
      `,
      [
        siteId,
        metric.name,
        metric.description ?? null,
        metric.source,
        metric.eventType ?? null,
        metric.aggregation,
        metric.field ?? null,
        JSON.stringify(metric.filters),
        JSON.stringify(metric.groupBy),
        userId,
      ],
    );

    return result.rows[0];
  }

  async listMetricDefinitions(siteId: string, userId: string) {
    await this.assertSiteAccess(siteId, userId);
    const result = await pg.query(
      `
        SELECT *
        FROM metric_definitions
        WHERE site_id = $1
        ORDER BY created_at DESC
      `,
      [siteId],
    );

    return result.rows;
  }

  async createKpi(siteId: string, userId: string, input: KpiInput) {
    await this.assertSiteAccess(siteId, userId);

    const metricId = normalizeString(input.metricId ?? input.metric_id, 80);
    const chartType = normalizeString(input.chartType ?? input.chart_type ?? 'number', 32) as KpiChartType;

    if (!metricId) throw new Error('metric_id e obrigatorio');
    if (!input.name) throw new Error('name e obrigatorio');
    if (!CHART_TYPES.has(chartType)) throw new Error('chart_type invalido');

    const metric = await pg.query(
      `SELECT id FROM metric_definitions WHERE id = $1 AND site_id = $2`,
      [metricId, siteId],
    );
    if (!metric.rowCount) throw new Error('Metric definition nao encontrada');

    const result = await pg.query(
      `
        INSERT INTO kpis (site_id, metric_id, name, chart_type, settings)
        VALUES ($1, $2, $3, $4, $5::jsonb)
        RETURNING *
      `,
      [siteId, metricId, normalizeString(input.name, 160), chartType, JSON.stringify(jsonObject(input.settings))],
    );

    return result.rows[0];
  }

  async createIntentRule(
    siteId: string,
    userId: string,
    input: {
      name?: string;
      intentType?: string;
      intent_type?: string;
      eventType?: string;
      event_type?: string;
      conditions?: unknown;
      weight?: unknown;
      isActive?: boolean;
      is_active?: boolean;
    },
  ) {
    await this.assertSiteAccess(siteId, userId);

    const name = normalizeString(input.name, 160);
    const intentType = normalizeString(input.intentType ?? input.intent_type, 120);
    const eventType = normalizeString(input.eventType ?? input.event_type, 120);
    const weight = Number(input.weight ?? 1);
    const isActive = input.isActive ?? input.is_active ?? true;

    if (!name) throw new Error('name e obrigatorio');
    if (!intentType) throw new Error('intent_type e obrigatorio');
    if (!eventType) throw new Error('event_type e obrigatorio');

    const result = await pg.query(
      `
        INSERT INTO intent_rules (site_id, name, intent_type, event_type, conditions, weight, is_active)
        VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
        RETURNING *
      `,
      [
        siteId,
        name,
        intentType,
        eventType,
        JSON.stringify(jsonObject(input.conditions)),
        Number.isFinite(weight) ? weight : 1,
        Boolean(isActive),
      ],
    );

    return result.rows[0];
  }

  async listIntentRules(siteId: string, userId: string) {
    await this.assertSiteAccess(siteId, userId);
    const result = await pg.query(
      `
        SELECT *
        FROM intent_rules
        WHERE site_id = $1
        ORDER BY created_at DESC
      `,
      [siteId],
    );

    return result.rows;
  }

  async listKpis(siteId: string, userId: string) {
    await this.assertSiteAccess(siteId, userId);
    const result = await pg.query(
      `
        SELECT
          k.*,
          md.name as metric_name,
          md.source,
          md.aggregation,
          md.field,
          md.group_by
        FROM kpis k
        JOIN metric_definitions md ON md.id = k.metric_id
        WHERE k.site_id = $1
        ORDER BY k.created_at DESC
      `,
      [siteId],
    );

    return result.rows;
  }

  async getKpiResult(kpiId: string, userId: string) {
    const result = await pg.query(
      `
        SELECT
          k.id as kpi_id,
          k.name as kpi_name,
          k.chart_type,
          k.settings,
          md.*
        FROM kpis k
        JOIN metric_definitions md ON md.id = k.metric_id
        WHERE k.id = $1
        LIMIT 1
      `,
      [kpiId],
    );

    if (!result.rowCount) throw new Error('KPI nao encontrado');
    const metric = result.rows[0] as MetricDefinitionRow & {
      kpi_id: string;
      kpi_name: string;
      chart_type: KpiChartType;
      settings: Record<string, unknown>;
    };

    await this.assertSiteAccess(metric.site_id, userId);
    const data = await this.calculateMetric(metric);

    return {
      kpiId: metric.kpi_id,
      name: metric.kpi_name,
      chartType: metric.chart_type,
      metricId: metric.id,
      data,
    };
  }

  async getDashboardBySite(siteId: string, userId: string) {
    await this.assertSiteAccess(siteId, userId);
    const dashboard = await this.getOrCreateDashboard(siteId, userId);
    return this.getDashboard(dashboard.id, userId);
  }

  async createDashboard(userId: string, input: { siteId?: string; site_id?: string; name?: string }) {
    const siteId = normalizeString(input.siteId ?? input.site_id, 80);
    if (!siteId) throw new Error('site_id e obrigatorio');
    await this.assertSiteAccess(siteId, userId);

    const result = await pg.query(
      `
        INSERT INTO dashboards (site_id, name, created_by)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [siteId, normalizeString(input.name ?? 'Dashboard', 160), userId],
    );

    return result.rows[0];
  }

  async getDashboard(dashboardId: string, userId: string) {
    const dashboardResult = await pg.query(`SELECT * FROM dashboards WHERE id = $1`, [dashboardId]);
    if (!dashboardResult.rowCount) throw new Error('Dashboard nao encontrado');

    const dashboard = dashboardResult.rows[0];
    await this.assertSiteAccess(dashboard.site_id, userId);

    const itemsResult = await pg.query(
      `
        SELECT
          di.*,
          k.name as kpi_name,
          k.chart_type,
          k.metric_id,
          md.name as metric_name,
          md.source,
          md.aggregation
        FROM dashboard_items di
        JOIN kpis k ON k.id = di.kpi_id
        JOIN metric_definitions md ON md.id = k.metric_id
        WHERE di.dashboard_id = $1
        ORDER BY di.pos_y ASC, di.pos_x ASC
      `,
      [dashboardId],
    );

    return {
      ...dashboard,
      items: itemsResult.rows,
    };
  }

  async updateDashboardItems(
    dashboardId: string,
    userId: string,
    items: Array<{ id?: string; kpiId?: string; kpi_id?: string; x?: number; y?: number; width?: number; height?: number; settings?: unknown }>,
  ) {
    const dashboard = await this.getDashboard(dashboardId, userId);
    const normalizedItems = Array.isArray(items) ? items : [];

    await pg.query('BEGIN');
    try {
      for (const item of normalizedItems) {
        const kpiId = normalizeString(item.kpiId ?? item.kpi_id, 80);
        if (!kpiId) continue;

        const kpi = await pg.query(`SELECT id FROM kpis WHERE id = $1 AND site_id = $2`, [kpiId, dashboard.site_id]);
        if (!kpi.rowCount) throw new Error('KPI sem permissao para este dashboard');

        if (item.id) {
          await pg.query(
            `
              UPDATE dashboard_items
              SET pos_x = $3, pos_y = $4, width = $5, height = $6, settings = $7::jsonb, updated_at = NOW()
              WHERE id = $1 AND dashboard_id = $2
            `,
            [
              item.id,
              dashboardId,
              this.layoutNumber(item.x, 0, 0),
              this.layoutNumber(item.y, 0, 0),
              this.layoutNumber(item.width, 4, 1),
              this.layoutNumber(item.height, 3, 1),
              JSON.stringify(jsonObject(item.settings)),
            ],
          );
        } else {
          await pg.query(
            `
              INSERT INTO dashboard_items (dashboard_id, kpi_id, pos_x, pos_y, width, height, settings)
              VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
            `,
            [
              dashboardId,
              kpiId,
              this.layoutNumber(item.x, 0, 0),
              this.layoutNumber(item.y, 0, 0),
              this.layoutNumber(item.width, 4, 1),
              this.layoutNumber(item.height, 3, 1),
              JSON.stringify(jsonObject(item.settings)),
            ],
          );
        }
      }

      await pg.query('COMMIT');
    } catch (error) {
      await pg.query('ROLLBACK');
      throw error;
    }

    return this.getDashboard(dashboardId, userId);
  }

  private validateMetricDefinition(input: MetricDefinitionInput) {
    const source = normalizeString(input.source, 64) as MetricSource;
    const aggregation = normalizeString(input.aggregation, 64) as MetricAggregation;
    const config = SOURCES[source];

    if (!input.name) throw new Error('name e obrigatorio');
    if (!config) throw new Error('source invalida');
    if (!AGGREGATIONS.has(aggregation)) throw new Error('aggregation invalida');

    const field = input.field ? normalizeString(input.field, 80) : undefined;
    if (field && !config.fields[field]) throw new Error('field invalido para source');
    if (aggregation !== 'count' && !field) throw new Error('field e obrigatorio para esta aggregation');
    if (['sum', 'avg', 'min', 'max'].includes(aggregation) && field && !config.numericFields.has(field)) {
      throw new Error('field precisa ser numerico para esta aggregation');
    }

    const filters = normalizeFilters(input.filters);
    for (const filter of filters) {
      if (!config.fields[filter.field]) throw new Error('filter field invalido');
    }

    const groupBy = normalizeGroupBy(input.groupBy ?? input.group_by);
    for (const fieldName of groupBy) {
      if (!config.fields[fieldName]) throw new Error('group_by field invalido');
    }

    return {
      name: normalizeString(input.name, 160),
      description: input.description ? normalizeString(input.description, 512) : undefined,
      source,
      eventType: normalizeString(input.eventType ?? input.event_type, 80) || undefined,
      aggregation,
      field,
      filters,
      groupBy,
    };
  }

  private async calculateMetric(metric: MetricDefinitionRow) {
    const config = SOURCES[metric.source];
    if (!config) throw new Error('source invalida');

    const params: unknown[] = [metric.site_id];
    const where = [config.sitePredicate];
    const filters = normalizeFilters(metric.filters ?? []);
    const groupBy = normalizeGroupBy(metric.group_by ?? []);

    if (metric.event_type) {
      if (metric.source !== 'events') throw new Error('event_type so e permitido para source events');
      params.push(metric.event_type);
      where.push(`e.event_type = $${params.length}`);
    }

    for (const filter of filters) {
      where.push(this.buildFilterPredicate(config, filter, params));
    }

    const groupColumns = groupBy.map((field) => config.fields[field]);
    const groupSelect = groupColumns.map((column, index) => `${column} AS group_${index}`).join(', ');
    const aggregation = this.buildAggregation(config, metric.aggregation, metric.field);
    const select = groupColumns.length ? `${groupSelect}, ${aggregation} AS value` : `${aggregation} AS value`;
    const groupClause = groupColumns.length ? `GROUP BY ${groupColumns.join(', ')}` : '';
    const orderClause = groupColumns.length ? `ORDER BY value DESC LIMIT 100` : '';

    const result = await pg.query(
      `
        SELECT ${select}
        FROM ${config.from}
        WHERE ${where.join(' AND ')}
        ${groupClause}
        ${orderClause}
      `,
      params,
    );

    if (!groupColumns.length) {
      return {
        value: Number(result.rows[0]?.value ?? 0),
      };
    }

    return {
      groups: result.rows.map((row) => ({
        key: groupBy.map((field, index) => ({
          field,
          value: row[`group_${index}`],
        })),
        value: Number(row.value ?? 0),
      })),
    };
  }

  private buildAggregation(config: SourceConfig, aggregation: MetricAggregation, field: string | null) {
    if (aggregation === 'count') return 'COUNT(*)::float';

    if (!field || !config.fields[field]) throw new Error('field invalido para aggregation');
    const column = config.fields[field];

    if (aggregation === 'unique_count') return `COUNT(DISTINCT ${column})::float`;
    if (!config.numericFields.has(field)) throw new Error('field precisa ser numerico para esta aggregation');

    return `${aggregation.toUpperCase()}(${column})::float`;
  }

  private buildFilterPredicate(config: SourceConfig, filter: MetricFilter, params: unknown[]) {
    const column = config.fields[filter.field];
    if (!column) throw new Error('filter field invalido');

    const operator = filter.operator ?? 'eq';
    if (!FILTER_OPERATORS.has(operator)) throw new Error('filter operator invalido');

    if (operator === 'in') {
      const values = Array.isArray(filter.value) ? filter.value.slice(0, 50) : [filter.value];
      params.push(values);
      return `${column} = ANY($${params.length})`;
    }

    params.push(operator === 'contains' ? `%${normalizeString(filter.value, 256)}%` : filter.value);
    const placeholder = `$${params.length}`;

    switch (operator) {
      case 'neq':
        return `${column} <> ${placeholder}`;
      case 'contains':
        return `${column} ILIKE ${placeholder}`;
      case 'gt':
        return `${column} > ${placeholder}`;
      case 'gte':
        return `${column} >= ${placeholder}`;
      case 'lt':
        return `${column} < ${placeholder}`;
      case 'lte':
        return `${column} <= ${placeholder}`;
      default:
        return `${column} = ${placeholder}`;
    }
  }

  private async getOrCreateDashboard(siteId: string, userId: string) {
    const existing = await pg.query(
      `SELECT * FROM dashboards WHERE site_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [siteId],
    );

    if (existing.rowCount) return existing.rows[0];

    const created = await pg.query(
      `
        INSERT INTO dashboards (site_id, name, created_by)
        VALUES ($1, $2, $3)
        RETURNING *
      `,
      [siteId, 'Dashboard principal', userId],
    );

    return created.rows[0];
  }

  private layoutNumber(value: unknown, fallback: number, min: number) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.round(parsed));
  }

  private async assertSiteAccess(siteId: string, userId: string) {
    if (!userId) throw new Error('Usuario nao autenticado');

    const result = await pg.query(
      `
        SELECT s.id
        FROM users u
        JOIN sites s ON (
          s.id = $2
          AND (
            u.is_root = true
            OR s.user_id = u.id
            OR (s.company_id IS NOT NULL AND s.company_id = u.company_id)
          )
        )
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId, siteId],
    );

    if (!result.rowCount) throw new Error('Site nao encontrado ou sem permissao');
  }
}
