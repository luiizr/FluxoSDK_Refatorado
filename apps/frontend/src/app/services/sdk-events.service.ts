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
  fieldErrors: number;
  avgFillTimeMs: number;
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
  sessionMetrics: {
    sessions: number;
    uniqueVisitors: number;
    newVisitors: number;
    returningVisitors: number;
    avgSessionDurationSeconds: number;
    pagesPerSession: number;
    eventsPerSession: number;
  };
  navigationMetrics: {
    entryPages: Array<{ path: string; total: number }>;
    exitPages: Array<{ path: string; total: number }>;
    topExitRates: Array<{ path: string; sessions: number; exits: number; exitRate: number }>;
    commonRoutes: Array<{ from: string; to: string; total: number }>;
  };
  engagementMetrics: {
    clicksPerSession: number;
    eventsPerSession: number;
    avgScrollDepth: number;
    engagedUsers: number;
  };
  funnelMetrics: Array<{
    name: string;
    starts: number;
    conversions: number;
    conversionRate: number;
    steps: Array<{ order: number; name: string; sessions: number; dropOff: number }>;
  }>;
  flowMetrics: Array<{ from: string; to: string; total: number }>;
  performanceMetrics: {
    ttfb: number;
    load: number;
    domContentLoaded: number;
    slowPages: Array<{ path: string; avgLoad: number; samples: number }>;
  };
  contextMetrics: {
    browsers: Array<{ label: string; total: number }>;
    os: Array<{ label: string; total: number }>;
    languages: Array<{ label: string; total: number }>;
    timezones: Array<{ label: string; total: number }>;
  };
  customEvents: Array<{ name: string; total: number }>;
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
}

export type {
  DashboardStats,
  DeviceMetric,
  ErrorMetric,
  FormMetric,
  LiveEvent,
  ProblemInteraction,
  SummaryStats,
  TopClick,
  TopPage,
  TrafficSource,
  WebVitalMetric,
};
