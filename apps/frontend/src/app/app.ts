import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { SdkEventsService, type LiveEvent } from './services/sdk-events.service';

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
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  private readonly sdkEventsService = inject(SdkEventsService);

  protected title = 'FluxoSDK Refatored';
  protected sdkLink = this.sdkEventsService.getSdkLink();
  protected liveEvents = signal<LiveEvent[]>([]);
  protected totalEvents = signal<number>(0);
  protected lastEventType = signal<string>('Nenhum evento recebido ainda');
  protected lastEventTime = signal<string>('---');
  protected domSummary = signal<DomSummary | null>(null);
  protected lastClickDescription = signal<string>('Nenhum clique capturado ainda');
  private pollInterval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.sdkEventsService.injectSdkScript();
    this.fetchRecentEvents();
    this.pollInterval = setInterval(() => {
      void this.fetchRecentEvents();
    }, 3000);
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
      const events = await this.sdkEventsService.getRecentEvents();

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
