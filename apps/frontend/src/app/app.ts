import { Component, OnDestroy, OnInit, inject, signal, HostListener } from '@angular/core';
import { CommonModule, DatePipe, JsonPipe } from '@angular/common';
import { SdkEventsService, type LiveEvent } from './services/sdk-events.service';
import { SitesService, type Site } from './services/sites.service';
import { AuthService } from './services/auth.service';
import { FormsModule } from '@angular/forms';

type DomSummary = {
  totalNodes?: number;
  totalButtons?: number;
  totalLinks?: number;
  totalInputs?: number;
  totalForms?: number;
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  @HostListener('window:scroll', [])
  onScroll() {
    this.checkScrollReveal();
  }

  checkScrollReveal() {
    const reveals = document.querySelectorAll('.reveal-on-scroll');
    const windowHeight = window.innerHeight;
    for (let i = 0; i < reveals.length; i++) {
        const elementTop = reveals[i].getBoundingClientRect().top;
        const elementVisible = 50;

        if (elementTop < windowHeight - elementVisible) {
          reveals[i].classList.add('is-visible');
        }
    }
  }

  private readonly sdkEventsService = inject(SdkEventsService);
  private readonly sitesService = inject(SitesService);
  private readonly authService = inject(AuthService);

  // Auth State
  protected isAuthenticated = signal<boolean>(false);
  protected isRegistering = signal<boolean>(false);
  protected showLanding = signal<boolean>(true);
  protected isAuthLoading = signal<boolean>(false);
  protected authEmail = signal<string>('');
  protected authPassword = signal<string>('');

  protected title = 'FluxoSDK Refatored';
  protected sdkLink = this.sdkEventsService.getSdkLink();
  protected liveEvents = signal<LiveEvent[]>([]);
  protected totalEvents = signal<number>(0);
  protected lastEventType = signal<string>('Nenhum evento recebido ainda');
  protected lastEventTime = signal<string>('---');
  protected activeUsers = signal<number>(0);
  protected avgTimeOnPage = signal<number>(0);
  protected domSummary = signal<DomSummary | null>(null);
  protected lastClickDescription = signal<string>('Nenhum clique capturado ainda');
  protected activeTab = signal<string>('overview');
  private pollInterval?: ReturnType<typeof setInterval>;

  protected sites = signal<Site[]>([]);
  protected selectedSiteKey = signal<string>('');

  // Demo Interactive State
  protected demoEvents = signal<{type: string, detail: string, time: string}[]>([]);

  // Create Site form
  protected newSiteName = signal<string>('');
  protected newSiteDomain = signal<string>('');
  protected isCreatingSite = signal<boolean>(false);

  async ngOnInit() {
    setTimeout(() => this.checkScrollReveal(), 100);
    const storedUserId = localStorage.getItem('fluxosdk_user_id');
    if (storedUserId) {
      this.isAuthenticated.set(true);
      await this.loadInitialData();
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

  async authenticate(event: Event) {
    event.preventDefault();
    if (!this.authEmail() || !this.authPassword()) return;

    this.isAuthLoading.set(true);
    try {
      let user;
      if (this.isRegistering()) {
        user = await this.authService.register(this.authEmail(), this.authPassword());
      } else {
        user = await this.authService.login(this.authEmail(), this.authPassword());
      }
      
      localStorage.setItem('fluxosdk_user_id', user.id);
      this.isAuthenticated.set(true);
      this.authEmail.set('');
      this.authPassword.set('');
      await this.loadInitialData();
    } catch (error: any) {
      alert(`Erro: ${error.message}`);
    } finally {
      this.isAuthLoading.set(false);
    }
  }

  logout() {
    localStorage.removeItem('fluxosdk_user_id');
    this.isAuthenticated.set(false);
    this.showLanding.set(true);
    this.sites.set([]);
    this.selectedSiteKey.set('');
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  async deleteSite(id: string, siteKey: string) {
    if (!confirm('Tem certeza que deseja remover este site e todos seus dados coletados?')) return;
    
    try {
      await this.sitesService.deleteSite(id);
      
      const updatedSites = this.sites().filter(s => s.id !== id);
      this.sites.set(updatedSites);
      
      if (this.selectedSiteKey() === siteKey) {
        this.selectedSiteKey.set(updatedSites.length ? updatedSites[0].siteKey : '');
        this.onSiteChanged();
      }
    } catch (error: any) {
      alert(`Erro ao remover: ${error.message}`);
    }
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

  async registerSite(event: Event) {
    event.preventDefault();
    if (!this.newSiteName() || !this.newSiteDomain()) return;

    this.isCreatingSite.set(true);
    try {
      await this.sitesService.createSite(this.newSiteName(), this.newSiteDomain());
      await this.loadSites();
      this.newSiteName.set('');
      this.newSiteDomain.set('');
    } catch (error) {
      alert(error);
    } finally {
      this.isCreatingSite.set(false);
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

  protected trackByEventId(_index: number, event: LiveEvent) {
    return event.event_id;
  }

  protected formatMetadata(metadata?: Record<string, unknown>) {
    return JSON.stringify(metadata ?? {}, null, 2);
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
        this.lastEventTime.set(new Date(events[0].created_at).toLocaleString('pt-BR'));
      } else {
        this.lastEventType.set('Nenhum evento recebido ainda');
        this.lastEventTime.set('---');
      }

      const latestDomSummary = events.find((event) => event.event_type === 'dom_summary');
      this.domSummary.set((latestDomSummary?.metadata as DomSummary | undefined) ?? null);

      const latestClick = events.find((event) => event.event_type === 'click'); 
      if (latestClick?.metadata) {
        const tag = String(latestClick.metadata['tag'] ?? 'elemento desconhecido');
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
