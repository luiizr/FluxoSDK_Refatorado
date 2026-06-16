import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../environment/environment.local';
import { firstValueFrom } from 'rxjs';

export interface SiteSettings {
  recordConsole: boolean;
  recordCanvas: boolean;
  recordInput: boolean;
  maskAllInputs: boolean;
  checkoutEveryNms: number;
}

export interface Site {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  public_key?: string;
  settings?: SiteSettings;
}

@Injectable({ providedIn: 'root' })
export class SiteService {
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');

  constructor(private http: HttpClient) {} // 👈 só isso

  async list(): Promise<Site[]> {
    const response = await firstValueFrom(
      this.http.get<{ ok: boolean; data: Site[] }>(`${this.apiUrl}/sites`)
    );
    if (!response.ok) throw new Error('Falha ao carregar sites');
    return response.data;
  }

  async create(name: string, domain: string): Promise<Site> {
    const response = await firstValueFrom(
      this.http.post<{ ok: boolean; data: Site }>(`${this.apiUrl}/sites`, { name, domain })
    );
    if (!response.ok) throw new Error('Erro ao criar site');
    return response.data;
  }

  async getSnippet(siteId: string): Promise<{ snippet: string; publicKey: string }> {
    const response = await firstValueFrom(
      this.http.get<{ ok: boolean; data: { snippet: string; publicKey: string } }>(
        `${this.apiUrl}/sites/${siteId}/snippet`
      )
    );
    if (!response.ok) throw new Error('Erro ao obter snippet');
    return response.data;
  }

  async updateSettings(siteId: string, settings: SiteSettings): Promise<Site> {
    const response = await firstValueFrom(
      this.http.patch<{ ok: boolean; data: Site }>(`${this.apiUrl}/sites/${siteId}/settings`, { settings })
    );
    if (!response.ok) throw new Error('Erro ao atualizar configurações');
    return response.data;
  }
}