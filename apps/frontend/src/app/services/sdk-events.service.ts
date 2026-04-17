import { Injectable } from '@angular/core';

type LiveEvent = {
  event_id: string;
  site_key: string;
  session_id: string;
  page_id: string;
  event_type: string;
  url: string;
  path: string;
  title: string;
  occurred_at: string;
  metadata?: Record<string, unknown>;
  created_at: string;
};

@Injectable({
  providedIn: 'root',
})
export class SdkEventsService {
  private readonly backendUrl = 'http://localhost:3000';
  private readonly sdkLink = `${this.backendUrl}/assets/embed.js`;

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
    document.body.appendChild(script);
  }

  async getRecentEvents(siteKey?: string): Promise<LiveEvent[]> {
    const url = new URL(`${this.backendUrl}/api/sdk/events/recent`);
    if (siteKey) {
      url.searchParams.append('siteKey', siteKey);
    }
    const response = await fetch(url.toString());
    const data = await response.json();
    return (data.data ?? []) as LiveEvent[];
  }
  async getStats(siteKey: string) {
    const url = new URL(`${this.backendUrl}/api/sdk/stats`);
    url.searchParams.append('siteKey', siteKey);
    const response = await fetch(url.toString());
    const data = await response.json();
    return data.data;
  }
}

export type { LiveEvent };
