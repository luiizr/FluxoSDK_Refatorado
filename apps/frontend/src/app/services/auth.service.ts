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
  
  async register(userPayload: UserPayload, avatarFile?: File) {
    const formData = new FormData();
    formData.append('name', userPayload.name);
    formData.append('email', userPayload.email);
    formData.append('password', userPayload.password);
    formData.append('twoFactor', String(userPayload.twoFactor));
    
    if (avatarFile) {
      formData.append('avatar', avatarFile);
    }
    
    const response = await fetch(`${this.apiUrl}/auth/register`, {
      method: 'POST',
      body: formData, // Não coloque 'Content-Type' manualmente
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
