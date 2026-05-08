import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AdminService, type AdminOverview } from '../../services/admin.service';
import {
  SdkEventsService,
  type DashboardItem,
  type DashboardLayout,
  type DashboardStats,
  type Kpi,
  type KpiResult,
  type LiveEvent,
  type MetricDefinition,
  type SummaryStats,
} from '../../services/sdk-events.service';
import { SitesService, type Site } from '../../services/sites.service';

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

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly sdkEventsService = inject(SdkEventsService);
  private readonly sitesService = inject(SitesService);
  private readonly adminService = inject(AdminService);
  private readonly router = inject(Router);

  protected currentUser = {
    name: 'Usuario',
    email: 'usuario@fluxosdk.com',
    isRoot: true,
  };

  protected sdkLink = this.sdkEventsService.getSdkLink();
  protected activeTab = signal<string>('overview');
  protected rangeHours = signal<number>(24);
  private pollInterval?: ReturnType<typeof setInterval>;

  protected sites = signal<Site[]>([]);
  protected selectedSiteKey = signal<string>('');
  protected newSiteName = signal<string>('');
  protected newSiteDomain = signal<string>('');
  protected isCreatingSite = signal<boolean>(false);
  protected isLoadingMetrics = signal<boolean>(false);
  protected dashboardError = signal<string>('');

  protected liveEvents = signal<LiveEvent[]>([]);
  protected stats = signal<DashboardStats | null>(null);
  protected adminOverview = signal<AdminOverview | null>(null);
  protected metricDefinitions = signal<MetricDefinition[]>([]);
  protected kpis = signal<Kpi[]>([]);
  protected kpiResults = signal<Record<string, KpiResult>>({});
  protected dashboardLayout = signal<DashboardLayout | null>(null);

  protected newMetricName = signal<string>('Eventos por tipo');
  protected newMetricSource = signal<string>('events');
  protected newMetricAggregation = signal<string>('count');
  protected newMetricField = signal<string>('');
  protected newMetricEventType = signal<string>('');
  protected newMetricGroupBy = signal<string>('event_type');
  protected selectedMetricId = signal<string>('');
  protected newKpiName = signal<string>('KPI configuravel');
  protected newKpiChartType = signal<string>('number');
  protected isSavingKpi = signal<boolean>(false);

  async ngOnInit() {
    this.extractUserInfo();
    await this.loadInitialData();
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

  protected setTab(tab: string, event: Event) {
    event.preventDefault();
    this.activeTab.set(tab);
    if (tab === 'admin' && this.currentUser.isRoot) {
      void this.loadAdminOverview();
    }
    if (tab === 'kpis' && this.selectedSiteId()) {
      void this.loadKpiData(this.selectedSiteId());
    }
  }

  protected onSiteChanged() {
    void this.fetchDashboardData();
  }

  protected onRangeChanged(value: string | number) {
    const nextRange = Number(value);
    this.rangeHours.set(Number.isFinite(nextRange) ? nextRange : 24);
    void this.fetchDashboardData();
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
    this.sites.set([]);
    this.selectedSiteKey.set('');
    if (this.pollInterval) clearInterval(this.pollInterval);
    void this.router.navigate(['/']);
  }

  protected async deleteSite(id: string, siteKey: string) {
    if (!confirm('Tem certeza que deseja remover este site e todos seus dados coletados?')) return;

    try {
      await this.sitesService.deleteSite(id);

      const updatedSites = this.sites().filter((site) => site.id !== id);
      this.sites.set(updatedSites);

      if (this.selectedSiteKey() === siteKey) {
        this.selectedSiteKey.set(updatedSites.length ? updatedSites[0].siteKey : '');
        await this.fetchDashboardData();
      }

      if (this.currentUser.isRoot) {
        await this.loadAdminOverview();
      }
    } catch (error) {
      alert(this.getErrorMessage(error));
    }
  }

  protected async registerSite(event: Event) {
    event.preventDefault();
    if (!this.newSiteName() || !this.newSiteDomain()) return;

    this.isCreatingSite.set(true);
    try {
      await this.sitesService.createSite(this.newSiteName(), this.newSiteDomain());
      await this.loadSites();
      await this.fetchDashboardData();
      this.newSiteName.set('');
      this.newSiteDomain.set('');
    } catch (error) {
      alert(this.getErrorMessage(error));
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
      const metric = await this.sdkEventsService.createMetricDefinition(siteId, {
        name: this.newMetricName(),
        source: this.newMetricSource(),
        aggregation: this.newMetricAggregation(),
        field: this.newMetricField() || undefined,
        eventType: this.newMetricEventType() || undefined,
        filters: [],
        groupBy,
      });

      this.selectedMetricId.set(metric.id);
      await this.loadKpiData(siteId);
    } catch (error) {
      this.dashboardError.set(this.getErrorMessage(error));
    } finally {
      this.isSavingKpi.set(false);
    }
  }

  protected async createKpi(event: Event) {
    event.preventDefault();
    const siteId = this.selectedSiteId();
    const metricId = this.selectedMetricId() || this.metricDefinitions()[0]?.id;
    if (!siteId || !metricId || !this.newKpiName()) return;

    this.isSavingKpi.set(true);
    try {
      await this.sdkEventsService.createKpi(siteId, {
        metricId,
        name: this.newKpiName(),
        chartType: this.newKpiChartType(),
        settings: {},
      });
      await this.loadKpiData(siteId);
    } catch (error) {
      this.dashboardError.set(this.getErrorMessage(error));
    } finally {
      this.isSavingKpi.set(false);
    }
  }

  protected async saveCurrentLayout() {
    const dashboard = this.dashboardLayout();
    if (!dashboard) return;

    this.isSavingKpi.set(true);
    try {
      const items = this.kpis().map((kpi, index) => {
        const current = this.dashboardItemFor(kpi.id);
        return {
          id: current?.id,
          kpiId: kpi.id,
          x: current?.pos_x ?? (index % 3) * 4,
          y: current?.pos_y ?? Math.floor(index / 3) * 3,
          width: current?.width ?? 4,
          height: current?.height ?? 3,
        };
      });
      const updated = await this.sdkEventsService.saveDashboardItems(dashboard.id, items);
      this.dashboardLayout.set(updated);
    } catch (error) {
      this.dashboardError.set(this.getErrorMessage(error));
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

  private async loadInitialData() {
    await this.loadSites();
    await this.fetchDashboardData();

    if (this.currentUser.isRoot) {
      await this.loadAdminOverview();
    }

    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      void this.fetchDashboardData();
      if (this.activeTab() === 'admin' && this.currentUser.isRoot) {
        void this.loadAdminOverview();
      }
    }, 8000);
  }

  private async loadSites() {
    try {
      const siteList = await this.sitesService.listSites();
      this.sites.set(siteList);
      if (siteList.length > 0 && !this.selectedSiteKey()) {
        this.selectedSiteKey.set(siteList[0].siteKey);
      }
    } catch (error) {
      this.dashboardError.set(this.getErrorMessage(error));
    }
  }

  private async fetchDashboardData() {
    const siteKey = this.selectedSiteKey();
    if (!siteKey) {
      this.liveEvents.set([]);
      this.stats.set(null);
      this.metricDefinitions.set([]);
      this.kpis.set([]);
      this.kpiResults.set({});
      this.dashboardLayout.set(null);
      return;
    }

    this.isLoadingMetrics.set(true);
    this.dashboardError.set('');
    try {
      const [events, stats] = await Promise.all([
        this.sdkEventsService.getRecentEvents(siteKey, 40),
        this.sdkEventsService.getStats(siteKey, this.rangeHours()),
      ]);
      this.liveEvents.set(events);
      this.stats.set(stats);
      if (this.selectedSiteId()) {
        await this.loadKpiData(this.selectedSiteId());
      }
    } catch (error) {
      this.dashboardError.set(this.getErrorMessage(error));
    } finally {
      this.isLoadingMetrics.set(false);
    }
  }

  private async loadAdminOverview() {
    try {
      const overview = await this.adminService.getOverview();
      this.adminOverview.set(overview);
    } catch (error) {
      this.dashboardError.set(this.getErrorMessage(error));
    }
  }

  private async loadKpiData(siteId: string) {
    try {
      const [metrics, kpis, dashboard] = await Promise.all([
        this.sdkEventsService.getMetricDefinitions(siteId),
        this.sdkEventsService.getKpis(siteId),
        this.sdkEventsService.getDashboard(siteId),
      ]);

      this.metricDefinitions.set(metrics);
      this.kpis.set(kpis);
      this.dashboardLayout.set(dashboard);

      if (!this.selectedMetricId() && metrics.length) {
        this.selectedMetricId.set(metrics[0].id);
      }

      const results = await Promise.all(
        kpis.map(async (kpi) => {
          try {
            return [kpi.id, await this.sdkEventsService.getKpiResult(kpi.id)] as const;
          } catch {
            return [kpi.id, null] as const;
          }
        }),
      );
      this.kpiResults.set(
        results.reduce<Record<string, KpiResult>>((acc, [kpiId, result]) => {
          if (result) acc[kpiId] = result;
          return acc;
        }, {}),
      );
    } catch (error) {
      this.dashboardError.set(this.getErrorMessage(error));
    }
  }

  private getErrorMessage(error: unknown) {
    return error instanceof Error ? error.message : 'Erro inesperado';
  }
}
