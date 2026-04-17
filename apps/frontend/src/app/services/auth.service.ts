import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly backendUrl = 'http://localhost:3000';

  async register(email: string, pass: string) {
    const response = await fetch(`${this.backendUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message);
    return data.data;
  }

  async login(email: string, pass: string) {
    const response = await fetch(`${this.backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass }),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message);
    return data.data;
  }
}
