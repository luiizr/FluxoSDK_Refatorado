import { Injectable } from '@angular/core';
import { environment } from '../environment/environment.local';

export interface UserPayload {
  name: string;
  email: string;
  password: string;
  twoFactor: boolean;
  urlPhoto?: string;
}
@Injectable({
  providedIn: 'root',
})


export class AuthService { 
  private readonly apiUrl = environment.apiUrl.replace(/\/$/, '');
  
  async register(UserPayload: UserPayload) {
    const response = await fetch(`${this.apiUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(UserPayload),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message);
    return data.data;
  }

  async login(UserPayload: UserPayload) {
    const response = await fetch(`${this.apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(UserPayload),
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.message);
    return data.data;
  }
}
