import { Injectable } from '@angular/core';

type AdminUser = {
  id: string;
  name?: string;
  email: string;
  is_root: boolean;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
};

type AdminSite = {
  id: string;
  name: string;
  domain: string;
  active: boolean;
  created_at: string;
  userId?: string;
  ownerName?: string;
  ownerEmail?: string;
  siteKey?: string;
  sessions: number;
  events: number;
};

type AdminOverview = {
  totals: {
    users: number;
    sites: number;
    activeKeys: number;
    events24h: number;
    activeSessions: number;
  };
  users: AdminUser[];
  sites: AdminSite[];
};

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly backendUrl = 'http://localhost:3000';

  private get userId() {
    return localStorage.getItem('fluxosdk_user_id') || '';
  }

  async getOverview(): Promise<AdminOverview> {
    const response = await fetch(`${this.backendUrl}/api/admin/overview`, {
      headers: { 'x-user-id': this.userId },
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message || 'Erro ao buscar painel admin');
    return data.data as AdminOverview;
  }
}

export type { AdminOverview, AdminSite, AdminUser };
