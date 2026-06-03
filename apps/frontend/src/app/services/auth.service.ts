import { Injectable } from '@angular/core';
import { environment } from '../environment/environment.local';

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  twoFactor?: boolean;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  name: string;
  email: string;
}

export interface AuthSession {
  user: AuthenticatedUser;
  accessToken: string;
}

type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  message?: string;
};

type BackendUser = {
  name: string;
  email: string;
};

type BackendSession = {
  user: BackendUser;
  accessToken: string;
};

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');
  private readonly tokenStorageKey = 'bearerToken';
  private readonly legacyStorageKeys = [
    'fluxosdk_user_id',
    'fluxosdk_user_name',
    'fluxosdk_user_email',
    'fluxosdk_user_is_root',
    'fluxosdk_user_two_factor',
    'fluxosdk_user_avatar_name',
  ];
  private currentUser: AuthenticatedUser | null = null;

  async register(userPayload: RegisterPayload, avatarFile?: File): Promise<AuthSession> {
    const formData = new FormData();
    formData.append('name', userPayload.name);
    formData.append('email', userPayload.email);
    formData.append('password', userPayload.password);
    formData.append('twoFactor', String(userPayload.twoFactor ?? false));

    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }

    const response = await fetch(`${this.apiUrl}/auth/register`, {
      method: 'POST',
      body: formData,
    });

    const session = this.normalizeSession(await this.parseResponse<BackendSession>(response));
    this.saveSession(session);
    return session;
  }

  async login(userPayload: LoginPayload): Promise<AuthSession> {
    const response = await fetch(`${this.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userPayload),
    });

    const session = this.normalizeSession(await this.parseResponse<BackendSession>(response));
    this.saveSession(session);
    return session;
  }

  async getCurrentUser(forceRefresh = false): Promise<AuthenticatedUser | null> {
    if (this.currentUser && !forceRefresh) {
      return this.currentUser;
    }

    const accessToken = this.getAccessToken();
    if (!accessToken) {
      return null;
    }

    try {
      const response = await fetch(`${this.apiUrl}/auth/me`, {
        headers: this.authHeaders(),
      });
      const user = this.normalizeUser(await this.parseResponse<BackendUser>(response));
      this.currentUser = user;
      return user;
    } catch {
      this.logout();
      return null;
    }
  }

  async validateSession(): Promise<boolean> {
    if (!this.hasUsableToken()) {
      return false;
    }

    return Boolean(await this.getCurrentUser());
  }

  isAuthenticated(): boolean {
    return this.hasUsableToken();
  }

  logout(): void {
    this.currentUser = null;
    this.removeStoredToken();
    this.removeLegacyUserStorage();
  }

  getAccessToken(): string | null {
    try {
      return localStorage.getItem(this.tokenStorageKey);
    } catch {
      return null;
    }
  }

  authHeaders(): HeadersInit {
    const accessToken = this.getAccessToken();
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }

  private saveSession(session: AuthSession): void {
    this.currentUser = session.user;
    this.saveAccessToken(session.accessToken);
    this.removeLegacyUserStorage();
  }

  private saveAccessToken(accessToken: string): void {
    try {
      localStorage.setItem(this.tokenStorageKey, accessToken);
    } catch {
      throw new Error('Não foi possível salvar a sessão neste navegador.');
    }
  }

  private removeStoredToken(): void {
    try {
      localStorage.removeItem(this.tokenStorageKey);
    } catch {
      // LocalStorage pode estar indisponível em alguns contextos.
    }
  }

  private removeLegacyUserStorage(): void {
    try {
      for (const key of this.legacyStorageKeys) {
        localStorage.removeItem(key);
      }
    } catch {
      // LocalStorage pode estar indisponível em alguns contextos.
    }
  }

  private hasUsableToken(): boolean {
    const accessToken = this.getAccessToken();
    if (!accessToken) {
      return false;
    }

    const payload = this.decodeTokenPayload(accessToken);
    if (!payload?.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
      this.logout();
      return false;
    }

    return true;
  }

  private decodeTokenPayload(accessToken: string): { exp?: number } | null {
    const payload = accessToken.split('.')[1];
    if (!payload) {
      return null;
    }

    try {
      const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
      return JSON.parse(atob(paddedBase64)) as { exp?: number };
    } catch {
      return null;
    }
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    const data = (await response.json()) as ApiResponse<T>;
    if (!response.ok || !data.ok || !data.data) {
      throw new Error(data.message || 'Erro inesperado');
    }

    return data.data;
  }

  private normalizeSession(session: BackendSession): AuthSession {
    return {
      accessToken: session.accessToken,
      user: this.normalizeUser(session.user),
    };
  }

  private normalizeUser(user: BackendUser): AuthenticatedUser {
    return {
      name: user.name,
      email: user.email,
    };
  }
}
