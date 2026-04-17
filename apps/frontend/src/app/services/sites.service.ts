import { Injectable } from '@angular/core';

export type Site = {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  siteKey: string;
  created_at: string;
};

@Injectable({
  providedIn: 'root',
})
export class SitesService {
  private readonly backendUrl = 'http://localhost:3000';

  private get userId() {
    return localStorage.getItem('fluxosdk_user_id') || '';
  }

  async listSites(): Promise<Site[]> {
    if (!this.userId) return [];
    
    const response = await fetch(`${this.backendUrl}/api/sites`, {
      headers: { 'x-user-id': this.userId }
    });
    const json = await response.json();
    return json.data as Site[];
  }

  async createSite(name: string, domain: string): Promise<Site> {
    if (!this.userId) throw new Error('Não autenticado');

    const response = await fetch(`${this.backendUrl}/api/sites`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': this.userId
      },
      body: JSON.stringify({ name, domain }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao criar site');
    }

    const json = await response.json();
    return json.data as Site;
  }

  async deleteSite(id: string) {
    if (!this.userId) throw new Error('Não autenticado');

    const response = await fetch(`${this.backendUrl}/api/sites/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-id': this.userId
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Erro ao deletar site');
    }
  }
}