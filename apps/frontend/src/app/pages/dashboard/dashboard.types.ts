export type DashboardTab = 'overview' | 'logs' | 'sessions' | 'kpis' | 'settings' | 'admin';

export interface CurrentUser {
  name: string;
  email: string;
  isRoot: boolean;
}

export interface Site {
  id: string;
  name: string;
  domain: string;
  siteKey: string;
  ownerEmail?: string | null;
  ownerName?: string | null;
  allowedOrigins?: string[];
  active?: boolean;
}

export interface NavItem {
  tab: DashboardTab;
  label: string;
  icon: string;
  requiresRoot?: boolean;
}

export interface SummaryStats {
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
}

export interface DashboardStats {
  rangeHours: number;
  summary: SummaryStats;
  topPages: Array<{
    path: string;
    title?: string;
    views: number;
    visitors?: number;
    avgTimeSeconds: number;
  }>;
  topClicks?: Array<{
    selector: string;
    text?: string;
    tag?: string;
    path: string;
    total: number;
  }>;
  problemInteractions: Array<{
    type: string;
    selector: string;
    text?: string;
    path: string;
    total: number;
  }>;
  formMetrics: Array<{
    path: string;
    formId: string;
    starts: number;
    submits: number;
    abandons: number;
    conversionRate: number;
  }>;
  errors: Array<{
    type: string;
    message: string;
    path: string;
    total: number;
    lastSeenAt?: string;
  }>;
  webVitals: Record<string, { value: number; samples: number }>;
  devices: Array<{
    deviceType: string;
    visitors: number;
  }>;
  trafficSources: Array<{
    source: string;
    visitors: number;
    pageViews: number;
  }>;
}

export interface LiveEvent {
  event_id: string;
  event_type: string;
  path: string;
  title: string;
  occurred_at: string;
  metadata?: Record<string, unknown> | null;
}

export interface MetricDefinition {
  id: string;
  name: string;
  source: string;
  aggregation: string;
  field?: string | null;
  event_type?: string | null;
  group_by?: string[] | null;
  groupBy?: string[] | null;
}

export interface Kpi {
  id: string;
  name: string;
  metric_id?: string;
  metric_name?: string | null;
  chart_type: string;
}

export interface DashboardItem {
  id?: string;
  kpi_id: string;
  pos_x: number;
  pos_y: number;
  width: number;
  height: number;
}

export interface DashboardLayout {
  id: string;
  items: DashboardItem[];
}

export interface KpiResult {
  data: {
    value?: number;
    groups?: Array<{
      key: Array<{ value: string | number | null }>;
      value: number;
    }>;
  };
}

export interface AdminOverview {
  totals: {
    users: number;
    sites: number;
    activeKeys: number;
    events24h: number;
    activeSessions: number;
  };
  users: Array<{
    id: string;
    name: string;
    email: string;
    is_root: boolean;
    is_active: boolean;
  }>;
  sites: Array<{
    id: string;
    name: string;
    domain: string;
    ownerEmail?: string | null;
    ownerName?: string | null;
    events: number;
  }>;
}

