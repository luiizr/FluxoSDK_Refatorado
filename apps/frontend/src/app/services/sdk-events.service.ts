import { Injectable } from '@angular/core';

type LiveEvent = {
  event_id: string;
  site_key: string;
  visitor_id?: string;
  session_id: string;
  page_id: string;
  event_type: string;
  event_name?: string;
  url: string;
  path: string;
  title: string;
  occurred_at: string;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
  created_at: string;
};

type SummaryStats = {
  totalEvents: number;
  pageViews: number;
  uniqueVisitors: number;
  sessions: number;
  activeUsers: number;
  avgTimeSeconds: number;
  bounceRate: number;
  errors: number;
  deadClicks: number;
  rageClicks: number;
  formStarts: number;
  formSubmits: number;
  formAbandons: number;
  formConversionRate: number;
};

type TopPage = {
  path: string;
  title: string;
  views: number;
  visitors: number;
  avgTimeSeconds: number;
};

type TopClick = {
  selector: string;
  text: string;
  tag: string;
  path: string;
  total: number;
};

type ProblemInteraction = {
  type: string;
  selector: string;
  text: string;
  path: string;
  total: number;
};

type FormMetric = {
  path: string;
  formId: string;
  starts: number;
  submits: number;
  abandons: number;
  conversionRate: number;
};

type ErrorMetric = {
  type: string;
  message: string;
  path: string;
  total: number;
  lastSeenAt: string;
};

type WebVitalMetric = {
  value: number;
  samples: number;
};

type DeviceMetric = {
  deviceType: string;
  visitors: number;
};

type TrafficSource = {
  source: string;
  visitors: number;
  pageViews: number;
};

type DashboardStats = {
  rangeHours: number;
  summary: SummaryStats;
  topPages: TopPage[];
  topClicks: TopClick[];
  problemInteractions: ProblemInteraction[];
  formMetrics: FormMetric[];
  errors: ErrorMetric[];
  webVitals: Record<string, WebVitalMetric>;
  devices: DeviceMetric[];
  trafficSources: TrafficSource[];
};

type MetricDefinition = {
  id: string;
  site_id: string;
  name: string;
  description?: string;
  source: string;
  event_type?: string;
  aggregation: string;
  field?: string;
  filters?: unknown[];
  group_by?: string[];
  created_at: string;
};

type Kpi = {
  id: string;
  site_id: string;
  metric_id: string;
  name: string;
  chart_type: 'number' | 'line' | 'bar' | 'pie' | 'table';
  settings?: Record<string, unknown>;
  metric_name?: string;
  source?: string;
  aggregation?: string;
  field?: string;
  group_by?: string[];
};

type KpiResult = {
  kpiId: string;
  name: string;
  chartType: string;
  metricId: string;
  data: {
    value?: number;
    groups?: Array<{
      key: Array<{ field: string; value: unknown }>;
      value: number;
    }>;
  };
};

type DashboardItem = {
  id: string;
  dashboard_id: string;
  kpi_id: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
  settings?: Record<string, unknown>;
  kpi_name?: string;
  chart_type?: string;
  metric_name?: string;
};

type DashboardLayout = {
  id: string;
  site_id: string;
  name: string;
  items: DashboardItem[];
};

@Injectable({
  providedIn: 'root',
})
export class SdkEventsService {
  private readonly backendUrl = 'http://localhost:3000';
  private readonly sdkLink = `${this.backendUrl}/assets/embed.js`;

  private get userId() {
    return localStorage.getItem('fluxosdk_user_id') || '';
  }

  getSdkLink() {
    return this.sdkLink;
  }

  injectSdkScript(siteKey = 'pk_test_123') {
    const existing = document.getElementById('fluxo-sdk-script');
    if (existing) return;

    const script = document.createElement('script');
    script.id = 'fluxo-sdk-script';
    script.src = this.sdkLink;
    script.dataset['siteKey'] = siteKey;
    script.dataset['apiUrl'] = this.backendUrl;
    script.dataset['trackApiErrors'] = 'true';
    document.body.appendChild(script);
  }

  async getRecentEvents(siteKey?: string, limit = 30): Promise<LiveEvent[]> {
    const url = new URL(`${this.backendUrl}/api/sdk/events/recent`);
    url.searchParams.append('limit', String(limit));
    if (siteKey) {
      url.searchParams.append('siteKey', siteKey);
    }

    const response = await fetch(url.toString(), {
      headers: { 'x-user-id': this.userId },
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'Erro ao buscar eventos');
    return (data.data ?? []) as LiveEvent[];
  }

  async getStats(siteKey: string, rangeHours = 24): Promise<DashboardStats> {
    const url = new URL(`${this.backendUrl}/api/sdk/stats`);
    url.searchParams.append('siteKey', siteKey);
    url.searchParams.append('rangeHours', String(rangeHours));

    const response = await fetch(url.toString(), {
      headers: { 'x-user-id': this.userId },
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'Erro ao buscar metricas');
    return data.data as DashboardStats;
  }

  async getMetricDefinitions(siteId: string): Promise<MetricDefinition[]> {
    const response = await fetch(`${this.backendUrl}/api/sites/${siteId}/metric-definitions`, {
      headers: { 'x-user-id': this.userId },
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'Erro ao buscar metric definitions');
    return (data.data ?? []) as MetricDefinition[];
  }

  async createMetricDefinition(siteId: string, payload: Record<string, unknown>): Promise<MetricDefinition> {
    const response = await fetch(`${this.backendUrl}/api/sites/${siteId}/metric-definitions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': this.userId,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'Erro ao criar metric definition');
    return data.data as MetricDefinition;
  }

  async getKpis(siteId: string): Promise<Kpi[]> {
    const response = await fetch(`${this.backendUrl}/api/sites/${siteId}/kpis`, {
      headers: { 'x-user-id': this.userId },
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'Erro ao buscar KPIs');
    return (data.data ?? []) as Kpi[];
  }

  async createKpi(siteId: string, payload: Record<string, unknown>): Promise<Kpi> {
    const response = await fetch(`${this.backendUrl}/api/sites/${siteId}/kpis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': this.userId,
      },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'Erro ao criar KPI');
    return data.data as Kpi;
  }

  async getKpiResult(kpiId: string): Promise<KpiResult> {
    const response = await fetch(`${this.backendUrl}/api/kpis/${kpiId}/result`, {
      headers: { 'x-user-id': this.userId },
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'Erro ao calcular KPI');
    return data.data as KpiResult;
  }

  async getDashboard(siteId: string): Promise<DashboardLayout> {
    const response = await fetch(`${this.backendUrl}/api/sites/${siteId}/dashboard`, {
      headers: { 'x-user-id': this.userId },
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'Erro ao buscar dashboard');
    return data.data as DashboardLayout;
  }

  async saveDashboardItems(
    dashboardId: string,
    items: Array<{ id?: string; kpiId: string; x: number; y: number; width: number; height: number }>
  ): Promise<DashboardLayout> {
    const response = await fetch(`${this.backendUrl}/api/dashboards/${dashboardId}/items`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': this.userId,
      },
      body: JSON.stringify({ items }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'Erro ao salvar layout');
    return data.data as DashboardLayout;
  }
}

export type {
  DashboardStats,
  DashboardItem,
  DashboardLayout,
  DeviceMetric,
  ErrorMetric,
  FormMetric,
  Kpi,
  KpiResult,
  LiveEvent,
  MetricDefinition,
  ProblemInteraction,
  SummaryStats,
  TopClick,
  TopPage,
  TrafficSource,
  WebVitalMetric,
};
