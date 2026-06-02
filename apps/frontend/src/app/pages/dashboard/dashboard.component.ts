import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DashboardSidebarComponent } from './components/dashboard-sidebar/dashboard-sidebar.component';
import { DashboardTopbarComponent } from './components/dashboard-topbar/dashboard-topbar.component';
import {
  AdminOverview,
  CurrentUser,
  DashboardItem,
  DashboardLayout,
  DashboardStats,
  DashboardTab,
  Kpi,
  KpiResult,
  LiveEvent,
  MetricDefinition,
  Site,
  SummaryStats,
} from './dashboard.types';

const EMPTY_SUMMARY: SummaryStats = {
  totalEvents: 0,
  pageViews: 0,
  uniqueVisitors: 0,
  sessions: 0,
  activeUsers: 0,
  avgTimeSeconds: 0,
  bounceRate: 0,
  errors: 0,
  deadClicks: 0,
  rageClicks: 0,
  formStarts: 0,
  formSubmits: 0,
  formAbandons: 0,
  formConversionRate: 0,
};

const DEFAULT_SITE: Site = {
  id: 'site-dashboard-demo',
  name: 'Produção',
  domain: 'app.fluxosdk.com',
  siteKey: 'pk_demo_fluxosdk',
  ownerEmail: 'usuario@fluxosdk.com',
  active: true,
};

const DEFAULT_STATS: DashboardStats = {
  rangeHours: 24,
  summary: {
    totalEvents: 18342,
    pageViews: 12640,
    uniqueVisitors: 2480,
    sessions: 3101,
    activeUsers: 54,
    avgTimeSeconds: 84,
    bounceRate: 28,
    errors: 12,
    deadClicks: 9,
    rageClicks: 4,
    formStarts: 188,
    formSubmits: 121,
    formAbandons: 67,
    formConversionRate: 64,
  },
  topPages: [
    { path: '/', title: 'Home', views: 5240, avgTimeSeconds: 92 },
    { path: '/pricing', title: 'Pricing', views: 2130, avgTimeSeconds: 68 },
    { path: '/checkout', title: 'Checkout', views: 1280, avgTimeSeconds: 54 },
  ],
  topClicks: [],
  problemInteractions: [
    { type: 'dead_click', selector: 'button#finalizar', text: 'Finalizar', path: '/checkout', total: 6 },
    { type: 'rage_click', selector: 'div#form', text: 'Formulario', path: '/lead', total: 3 },
  ],
  formMetrics: [
    { path: '/lead', formId: 'lead-form', starts: 48, submits: 29, abandons: 19, conversionRate: 60 },
  ],
  errors: [
    { type: 'js_error', message: 'TypeError no checkout', path: '/checkout', total: 4, lastSeenAt: new Date().toISOString() },
    { type: 'api_error', message: 'Gateway timeout', path: '/api/orders', total: 2, lastSeenAt: new Date().toISOString() },
  ],
  webVitals: {
    lcp: { value: 1820, samples: 42 },
    inp: { value: 112, samples: 42 },
    cls: { value: 0.08, samples: 42 },
    fcp: { value: 740, samples: 42 },
  },
  devices: [
    { deviceType: 'desktop', visitors: 1540 },
    { deviceType: 'mobile', visitors: 820 },
    { deviceType: 'tablet', visitors: 120 },
  ],
  trafficSources: [
    { source: 'direct', visitors: 1260, pageViews: 6020 },
    { source: 'google', visitors: 820, pageViews: 5020 },
    { source: 'linkedin', visitors: 240, pageViews: 1600 },
  ],
};

const DEFAULT_ADMIN: AdminOverview = {
  totals: {
    users: 12,
    sites: 5,
    activeKeys: 5,
    events24h: 18342,
    activeSessions: 24,
  },
  users: [
    { id: 'user-1', name: 'Usuario Demo', email: 'usuario@fluxosdk.com', is_root: true, is_active: true },
    { id: 'user-2', name: 'Ana Souza', email: 'ana@fluxosdk.com', is_root: false, is_active: true },
  ],
  sites: [
    { id: 'site-dashboard-demo', name: 'Produção', domain: 'app.fluxosdk.com', ownerEmail: 'usuario@fluxosdk.com', events: 16420 },
    { id: 'site-2', name: 'Staging', domain: 'staging.fluxosdk.com', ownerEmail: 'ana@fluxosdk.com', events: 1922 },
  ],
};

const DEFAULT_METRICS: MetricDefinition[] = [
  {
    id: 'metric-events-by-type',
    name: 'Eventos por tipo',
    source: 'events',
    aggregation: 'count',
    field: '',
    event_type: null,
    group_by: ['event_type'],
  },
];

const DEFAULT_KPIS: Kpi[] = [
  {
    id: 'kpi-total-events',
    name: 'Total de eventos',
    metric_id: 'metric-events-by-type',
    metric_name: 'Eventos por tipo',
    chart_type: 'number',
  },
];

const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = {
  id: 'dashboard-demo',
  items: [
    {
      id: 'dashboard-item-1',
      kpi_id: 'kpi-total-events',
      pos_x: 0,
      pos_y: 0,
      width: 4,
      height: 3,
    },
  ],
};

const DEFAULT_KPI_RESULTS: Record<string, KpiResult> = {
  'kpi-total-events': {
    data: {
      value: DEFAULT_STATS.summary.totalEvents,
      groups: [
        { key: [{ value: 'page_view' }], value: 12640 },
        { key: [{ value: 'click' }], value: 3412 },
        { key: [{ value: 'form_submit' }], value: 121 },
      ],
    },
  },
};

const DEFAULT_LIVE_EVENTS: LiveEvent[] = [
  {
    event_id: 'evt-1',
    event_type: 'page_view',
    path: '/',
    title: 'Home',
    occurred_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    metadata: { selector: 'body', text: 'Home' },
  },
  {
    event_id: 'evt-2',
    event_type: 'click',
    path: '/pricing',
    title: 'Pricing',
    occurred_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    metadata: { selector: 'button#start', text: 'Comecar' },
  },
];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, DashboardSidebarComponent, DashboardTopbarComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private pollInterval?: ReturnType<typeof setInterval>;

  protected currentUser: CurrentUser = {
    name: 'Usuario',
    email: 'usuario@fluxosdk.com',
    isRoot: true,
  };

  protected sdkLink = 'http://localhost:3000/assets/embed.js';
  protected activeTab = signal<DashboardTab>('overview');
  protected rangeHours = signal<number>(24);

  protected sites = signal<Site[]>([DEFAULT_SITE]);
  protected selectedSiteKey = signal<string>(DEFAULT_SITE.siteKey);
  protected newSiteName = signal<string>('');
  protected newSiteDomain = signal<string>('');
  protected isCreatingSite = signal<boolean>(false);
  protected isLoadingMetrics = signal<boolean>(false);
  protected dashboardError = signal<string>('');

  protected liveEvents = signal<LiveEvent[]>(DEFAULT_LIVE_EVENTS);
  protected stats = signal<DashboardStats | null>(DEFAULT_STATS);
  protected adminOverview = signal<AdminOverview | null>(DEFAULT_ADMIN);
  protected metricDefinitions = signal<MetricDefinition[]>(DEFAULT_METRICS);
  protected kpis = signal<Kpi[]>(DEFAULT_KPIS);
  protected kpiResults = signal<Record<string, KpiResult>>(DEFAULT_KPI_RESULTS);
  protected dashboardLayout = signal<DashboardLayout | null>(DEFAULT_DASHBOARD_LAYOUT);

  protected newMetricName = signal<string>('Eventos por tipo');
  protected newMetricSource = signal<string>('events');
  protected newMetricAggregation = signal<string>('count');
  protected newMetricField = signal<string>('');
  protected newMetricEventType = signal<string>('');
  protected newMetricGroupBy = signal<string>('event_type');
  protected selectedMetricId = signal<string>(DEFAULT_METRICS[0].id);
  protected newKpiName = signal<string>('KPI configuravel');
  protected newKpiChartType = signal<string>('number');
  protected isSavingKpi = signal<boolean>(false);

  async ngOnInit() {
    this.extractUserInfo();
    this.initializeLocalData();

    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      if (this.activeTab() === 'admin' && this.currentUser.isRoot) {
        this.ensureAdminOverview();
      }
    }, 8000);
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  protected summary(): SummaryStats {
    return this.stats()?.summary ?? EMPTY_SUMMARY;
  }

  protected selectedSite() {
    return this.sites().find((site) => site.siteKey === this.selectedSiteKey()) ?? null;
  }

  protected selectedSiteId() {
    return this.selectedSite()?.id ?? '';
  }

  protected sdkSnippet() {
    return `<script src="${this.sdkLink}" data-site-key="${this.selectedSiteKey()}" data-track-api-errors="true"></script>`;
  }

  protected setTab(tab: DashboardTab) {
    this.activeTab.set(tab);
    if (tab === 'admin' && this.currentUser.isRoot) {
      this.ensureAdminOverview();
    }
  }

  protected onSiteChanged() {
    if (!this.selectedSite()) {
      const firstSite = this.sites()[0];
      this.selectedSiteKey.set(firstSite?.siteKey ?? '');
    }
  }

  protected onRangeChanged(value: string | number) {
    const nextRange = Number(value);
    this.rangeHours.set(Number.isFinite(nextRange) ? nextRange : 24);
  }

  protected async copySnippet() {
    try {
      await navigator.clipboard.writeText(this.sdkSnippet());
    } catch {
      this.dashboardError.set('Nao foi possivel copiar automaticamente.');
    }
  }

  protected trackByEventId(_index: number, event: LiveEvent) {
    return event.event_id;
  }

  protected trackBySiteId(_index: number, site: Site) {
    return site.id;
  }

  protected trackByAdminUser(_index: number, user: { id: string }) {
    return user.id;
  }

  protected trackByMetricId(_index: number, metric: MetricDefinition) {
    return metric.id;
  }

  protected trackByKpiId(_index: number, kpi: Kpi) {
    return kpi.id;
  }

  protected eventLabel(type: string) {
    const labels: Record<string, string> = {
      page_view: 'Page view',
      route_change: 'Mudanca de rota',
      page_leave: 'Saida de pagina',
      click: 'Clique',
      dead_click: 'Clique sem acao',
      rage_click: 'Clique repetido',
      form_start: 'Inicio de formulario',
      form_submit: 'Envio de formulario',
      form_abandon: 'Abandono de formulario',
      scroll_depth: 'Profundidade de scroll',
      web_vital: 'Web vital',
      performance: 'Performance',
      js_error: 'Erro JS',
      resource_error: 'Erro de recurso',
      api_error: 'Erro de API',
      custom: 'Evento customizado',
      identify: 'Identificacao',
    };
    return labels[type] ?? type;
  }

  protected formatSeconds(seconds: number) {
    if (!seconds) return '0s';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remaining = Math.round(seconds % 60);
    return `${minutes}m ${remaining}s`;
  }

  protected formatNumber(value: number) {
    return new Intl.NumberFormat('pt-BR').format(value || 0);
  }

  protected formatPercent(value: number) {
    return `${Math.round(value || 0)}%`;
  }

  protected kpiValue(kpiId: string) {
    const result = this.kpiResults()[kpiId];
    if (!result) return '--';
    if (typeof result.data.value === 'number') return this.formatNumber(result.data.value);
    return this.formatNumber(result.data.groups?.reduce((total, group) => total + (group.value || 0), 0) ?? 0);
  }

  protected kpiGroups(kpiId: string) {
    return this.kpiResults()[kpiId]?.data.groups ?? [];
  }

  protected dashboardItemFor(kpiId: string): DashboardItem | undefined {
    return this.dashboardLayout()?.items?.find((item) => item.kpi_id === kpiId);
  }

  protected gridColumn(kpiId: string) {
    return `span ${this.dashboardItemFor(kpiId)?.width ?? 4}`;
  }

  protected gridRow(kpiId: string) {
    return `span ${this.dashboardItemFor(kpiId)?.height ?? 3}`;
  }

  protected vitalValue(name: string) {
    const metric = this.stats()?.webVitals[name];
    if (!metric) return '--';
    if (name === 'cls') return metric.value.toFixed(2);
    return `${Math.round(metric.value)}ms`;
  }

  protected logout() {
    localStorage.removeItem('fluxosdk_user_id');
    localStorage.removeItem('fluxosdk_user_name');
    localStorage.removeItem('fluxosdk_user_email');
    localStorage.removeItem('fluxosdk_user_is_root');
    this.resetLocalState();
    void this.router.navigate(['/']);
  }

  protected async deleteSite(id: string, siteKey: string) {
    if (!confirm('Tem certeza que deseja remover este site e todos seus dados coletados?')) return;

    const updatedSites = this.sites().filter((site) => site.id !== id);
    this.sites.set(updatedSites);

    if (this.selectedSiteKey() === siteKey) {
      this.selectedSiteKey.set(updatedSites.length ? updatedSites[0].siteKey : '');
    }

    if (!updatedSites.length) {
      this.resetDashboardCollections();
    }

    this.ensureAdminOverview();
  }

  protected async registerSite(event: Event) {
    event.preventDefault();
    if (!this.newSiteName() || !this.newSiteDomain()) return;

    this.isCreatingSite.set(true);
    try {
      const cleanDomain = this.newSiteDomain().replace(/^https?:\/\//, '').split('/')[0];
      const siteKey = `pk_${cleanDomain.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'site'}_${Date.now()}`;
      const newSite: Site = {
        id: `site-${Date.now()}`,
        name: this.newSiteName(),
        domain: cleanDomain,
        siteKey,
        ownerEmail: this.currentUser.email,
        active: true,
      };

      this.sites.set([newSite, ...this.sites()]);
      this.selectedSiteKey.set(newSite.siteKey);
      this.newSiteName.set('');
      this.newSiteDomain.set('');
      this.ensureAdminOverview();
    } finally {
      this.isCreatingSite.set(false);
    }
  }

  protected async createMetricDefinition(event: Event) {
    event.preventDefault();
    const siteId = this.selectedSiteId();
    if (!siteId || !this.newMetricName()) return;

    this.isSavingKpi.set(true);
    try {
      const groupBy = this.newMetricGroupBy()
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      const metric: MetricDefinition = {
        id: `metric-${Date.now()}`,
        name: this.newMetricName(),
        source: this.newMetricSource(),
        aggregation: this.newMetricAggregation(),
        field: this.newMetricField() || null,
        event_type: this.newMetricEventType() || null,
        group_by: groupBy,
      };

      this.metricDefinitions.set([metric, ...this.metricDefinitions()]);
      this.selectedMetricId.set(metric.id);
    } finally {
      this.isSavingKpi.set(false);
    }
  }

  protected async createKpi(event: Event) {
    event.preventDefault();
    const metricId = this.selectedMetricId() || this.metricDefinitions()[0]?.id;
    if (!metricId || !this.newKpiName()) return;

    this.isSavingKpi.set(true);
    try {
      const metric = this.metricDefinitions().find((item) => item.id === metricId);
      const kpi: Kpi = {
        id: `kpi-${Date.now()}`,
        name: this.newKpiName(),
        metric_id: metricId,
        metric_name: metric?.name ?? metricId,
        chart_type: this.newKpiChartType(),
      };

      const nextKpis = [kpi, ...this.kpis()];
      this.kpis.set(nextKpis);
      this.kpiResults.set({
        ...this.kpiResults(),
        [kpi.id]: {
          data: {
            value: 0,
            groups: [],
          },
        },
      });

      const currentLayout = this.dashboardLayout();
      const nextLayout: DashboardLayout = currentLayout
        ? {
            ...currentLayout,
            items: [
              ...currentLayout.items,
              {
                id: `dashboard-item-${Date.now()}`,
                kpi_id: kpi.id,
                pos_x: ((nextKpis.length - 1) % 3) * 4,
                pos_y: Math.floor((nextKpis.length - 1) / 3) * 3,
                width: 4,
                height: 3,
              },
            ],
          }
        : {
            id: 'dashboard-local',
            items: [
              {
                id: `dashboard-item-${Date.now()}`,
                kpi_id: kpi.id,
                pos_x: 0,
                pos_y: 0,
                width: 4,
                height: 3,
              },
            ],
          };

      this.dashboardLayout.set(nextLayout);
      this.newKpiName.set('KPI configuravel');
    } finally {
      this.isSavingKpi.set(false);
    }
  }

  protected async saveCurrentLayout() {
    const dashboard = this.dashboardLayout();
    if (!dashboard) return;

    this.isSavingKpi.set(true);
    try {
      this.dashboardLayout.set({
        ...dashboard,
        items: dashboard.items.map((item) => ({ ...item })),
      });
    } finally {
      this.isSavingKpi.set(false);
    }
  }

  private extractUserInfo() {
    try {
      const email = localStorage.getItem('fluxosdk_user_email');
      const name = localStorage.getItem('fluxosdk_user_name');
      const isRoot = localStorage.getItem('fluxosdk_user_is_root') === 'true';
      this.currentUser = {
        name: name || 'Usuario',
        email: email || 'usuario@fluxosdk.com',
        isRoot,
      };
    } catch {
      // LocalStorage pode estar indisponivel em alguns contextos.
    }
  }

  private initializeLocalData() {
    this.sites.set([DEFAULT_SITE, ...this.sites().filter((site) => site.id !== DEFAULT_SITE.id)]);
    if (!this.selectedSiteKey()) {
      this.selectedSiteKey.set(this.sites()[0]?.siteKey ?? '');
    }

    if (!this.currentUser.isRoot) {
      this.adminOverview.set(null);
    }

    this.ensureAdminOverview();
  }

  private ensureAdminOverview() {
    if (this.currentUser.isRoot && !this.adminOverview()) {
      this.adminOverview.set(DEFAULT_ADMIN);
    }
  }

  private resetDashboardCollections() {
    this.liveEvents.set([]);
    this.stats.set(null);
    this.metricDefinitions.set([]);
    this.kpis.set([]);
    this.kpiResults.set({});
    this.dashboardLayout.set(null);
    this.selectedMetricId.set('');
  }

  private resetLocalState() {
    this.activeTab.set('overview');
    this.rangeHours.set(24);
    this.sites.set([DEFAULT_SITE]);
    this.selectedSiteKey.set(DEFAULT_SITE.siteKey);
    this.newSiteName.set('');
    this.newSiteDomain.set('');
    this.dashboardError.set('');
    this.isCreatingSite.set(false);
    this.isLoadingMetrics.set(false);
    this.liveEvents.set(DEFAULT_LIVE_EVENTS);
    this.stats.set(DEFAULT_STATS);
    this.adminOverview.set(DEFAULT_ADMIN);
    this.metricDefinitions.set(DEFAULT_METRICS);
    this.kpis.set(DEFAULT_KPIS);
    this.kpiResults.set(DEFAULT_KPI_RESULTS);
    this.dashboardLayout.set(DEFAULT_DASHBOARD_LAYOUT);
    this.selectedMetricId.set(DEFAULT_METRICS[0].id);
    this.newMetricName.set('Eventos por tipo');
    this.newMetricSource.set('events');
    this.newMetricAggregation.set('count');
    this.newMetricField.set('');
    this.newMetricEventType.set('');
    this.newMetricGroupBy.set('event_type');
    this.newKpiName.set('KPI configuravel');
    this.newKpiChartType.set('number');
    this.isSavingKpi.set(false);
  }
}
