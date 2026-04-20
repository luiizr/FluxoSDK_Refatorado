import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

// Services
import {
  SdkEventsService,
  type LiveEvent,
} from '../../services/sdk-events.service';
import { SitesService, type Site } from '../../services/sites.service';

type DomSummary = {
  totalNodes?: number;
  totalButtons?: number;
  totalLinks?: number;
  totalInputs?: number;
  totalForms?: number;
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss', // SCSS refactor next
})
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly sdkEventsService = inject(SdkEventsService);
  private readonly sitesService = inject(SitesService);
  private readonly router = inject(Router);

  protected currentUser = {
    name: 'Admin',
    email: 'carregando...',
  };

  // General App State
  protected sdkLink = this.sdkEventsService.getSdkLink();
  protected activeTab = signal<string>('overview');
  private pollInterval?: ReturnType<typeof setInterval>;

  // Site Management State
  protected sites = signal<Site[]>([]);
  protected selectedSiteKey = signal<string>('');
  protected newSiteName = signal<string>('');
  protected newSiteDomain = signal<string>('');
  protected isCreatingSite = signal<boolean>(false);

  // Real-time Data
  protected liveEvents = signal<LiveEvent[]>([]);
  protected totalEvents = signal<number>(0);
  protected lastEventType = signal<string>('Nenhum evento recebido ainda');
  protected lastEventTime = signal<string>('---');
  protected activeUsers = signal<number>(0);
  protected avgTimeOnPage = signal<number>(0);
  protected domSummary = signal<DomSummary | null>(null);
  protected lastClickDescription = signal<string>(
    'Nenhum clique capturado ainda',
  );

  async ngOnInit() {
    this.extractUserInfo();
    await this.loadInitialData();
  }

  extractUserInfo() {
    try {
      const email = localStorage.getItem('fluxosdk_user_email');
      const name = localStorage.getItem('fluxosdk_user_name');
      this.currentUser = {
        name: name || 'Usuário',
        email: email || 'usuario@fluxosdk.com',
      };
    } catch {
      // Ignorar erros se localstorage não estiver disponível
    }
  }

  async loadInitialData() {
    await this.loadSites();
    this.fetchRecentEvents();
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => {
      void this.fetchRecentEvents();
    }, 3000);
  }

  async loadSites() {
    try {
      const siteList = await this.sitesService.listSites();
      this.sites.set(siteList);
      if (siteList.length > 0 && !this.selectedSiteKey()) {
        this.selectedSiteKey.set(siteList[0].siteKey);
      }
    } catch (error) {
      console.error('Erro ao listar sites:', error);
    }
  }

  onSiteChanged() {
    this.fetchRecentEvents();
  }

  setTab(tab: string, event: Event) {
    event.preventDefault();
    this.activeTab.set(tab);
  }

  ngOnDestroy() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  logout() {
    localStorage.removeItem('fluxosdk_user_id');
    this.sites.set([]);
    this.selectedSiteKey.set('');
    if (this.pollInterval) clearInterval(this.pollInterval);
    // Redireciona via router
    this.router.navigate(['/']);
  }

  // --- Site Management Lógicas ---
  async deleteSite(id: string, siteKey: string) {
    if (
      !confirm(
        'Tem certeza que deseja remover este site e todos seus dados coletados?',
      )
    )
      return;

    try {
      await this.sitesService.deleteSite(id);

      const updatedSites = this.sites().filter((s) => s.id !== id);
      this.sites.set(updatedSites);

      if (this.selectedSiteKey() === siteKey) {
        this.selectedSiteKey.set(
          updatedSites.length ? updatedSites[0].siteKey : '',
        );
        this.onSiteChanged();
      }
    } catch (error: any) {
      alert(`Erro ao remover: ${error.message}`);
    }
  }

  async registerSite(event: Event) {
    event.preventDefault();
    if (!this.newSiteName() || !this.newSiteDomain()) return;

    this.isCreatingSite.set(true);
    try {
      await this.sitesService.createSite(
        this.newSiteName(),
        this.newSiteDomain(),
      );
      await this.loadSites();
      this.newSiteName.set('');
      this.newSiteDomain.set('');
    } catch (error: any) {
      alert(error.message);
    } finally {
      this.isCreatingSite.set(false);
    }
  }

  // --- Helpers e Polling de dados ---
  protected trackByEventId(_index: number, event: LiveEvent) {
    return event.event_id;
  }

  private async fetchRecentEvents() {
    try {
      const siteKey = this.selectedSiteKey() || undefined;
      const events = await this.sdkEventsService.getRecentEvents(siteKey);

      if (siteKey) {
        const stats = await this.sdkEventsService.getStats(siteKey);
        this.activeUsers.set(stats.activeUsers || 0);
        this.avgTimeOnPage.set(stats.avgTimeSeconds || 0);
      }

      this.liveEvents.set(events);
      this.totalEvents.set(events.length);

      if (events.length > 0) {
        this.lastEventType.set(events[0].event_type);
        this.lastEventTime.set(
          new Date(events[0].created_at).toLocaleString('pt-BR'),
        );
      } else {
        this.lastEventType.set('Nenhum evento recebido ainda');
        this.lastEventTime.set('---');
      }

      const latestDomSummary = events.find(
        (event) => event.event_type === 'dom_summary',
      );
      this.domSummary.set(
        (latestDomSummary?.metadata as DomSummary | undefined) ?? null,
      );

      const latestClick = events.find((event) => event.event_type === 'click');
      if (latestClick?.metadata) {
        const tag = String(
          latestClick.metadata['tag'] ?? 'elemento desconhecido',
        );
        const text = String(latestClick.metadata['text'] ?? 'sem texto');
        this.lastClickDescription.set(`${tag} - ${text}`);
      } else {
        this.lastClickDescription.set('Nenhum clique capturado ainda');
      }
    } catch (error) {
      console.error(error);
    }
  }
}
