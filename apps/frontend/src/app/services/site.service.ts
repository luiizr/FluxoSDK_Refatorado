import { Injectable } from '@angular/core';
import { environment } from '../environment/environment.local';
import { AuthService } from './auth.service';

export interface Site {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  public_key?: string;
}

@Injectable({
  providedIn: 'root',
})
export class SiteService {
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');

  constructor(private authService: AuthService) {}

  async list(): Promise<Site[]> {
    const response = await fetch(`${this.apiUrl}/sites`, {
      headers: this.authService.authHeaders(),
    });
    const data = await response.json();
    return data.ok ? data.data : [];
  }

  async create(name: string, domain: string): Promise<Site> {
    const response = await fetch(`${this.apiUrl}/sites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...this.authService.authHeaders(),
      },
      body: JSON.stringify({ name, domain }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message);
    return data.data;
  }

  async getSnippet(siteId: string): Promise<{ snippet: string; publicKey: string }> {
    const response = await fetch(`${this.apiUrl}/sites/${siteId}/snippet`, {
      headers: this.authService.authHeaders(),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message);
    return data.data;
  }
}
