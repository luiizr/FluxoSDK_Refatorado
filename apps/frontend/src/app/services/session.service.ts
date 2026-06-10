import { Injectable } from '@angular/core';
import { environment } from '../environment/environment.local';
import { AuthService } from './auth.service';

export interface BrowserSession {
  id: string;
  session_id: string;
  visitor_id: string;
  last_seen_at: string;
  event_count: number;
  click_count: number;
  duration_seconds: number;
}

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');

  constructor(private authService: AuthService) {}

  async list(siteId?: string): Promise<BrowserSession[]> {
    let url = `${this.apiUrl}/sessions`;
    if (siteId) url += `?siteId=${siteId}`;

    const response = await fetch(url, {
      headers: this.authService.authHeaders(),
    });
    const data = await response.json();
    return data.ok ? data.data : [];
  }

  async getEvents(sessionId: string): Promise<any[]> {
    const response = await fetch(`${this.apiUrl}/sessions/${sessionId}/events`, {
      headers: this.authService.authHeaders(),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message);
    return data.data;
  }
}
