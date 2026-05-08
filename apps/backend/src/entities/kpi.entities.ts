export type MetricAggregation = 'count' | 'sum' | 'avg' | 'min' | 'max' | 'unique_count';

export type MetricSource = 'events' | 'sessions' | 'detected_intents' | 'metric_aggregates';

export type KpiChartType = 'number' | 'line' | 'bar' | 'pie' | 'table';

export type MetricFilter = {
  field: string;
  operator?: 'eq' | 'neq' | 'contains' | 'in' | 'gt' | 'gte' | 'lt' | 'lte';
  value: unknown;
};

export type MetricDefinitionInput = {
  name: string;
  description?: string;
  source: MetricSource;
  eventType?: string;
  event_type?: string;
  aggregation: MetricAggregation;
  field?: string;
  filters?: MetricFilter[];
  groupBy?: string[];
  group_by?: string[];
};

export type KpiInput = {
  metricId?: string;
  metric_id?: string;
  name: string;
  chartType?: KpiChartType;
  chart_type?: KpiChartType;
  settings?: Record<string, unknown>;
};
