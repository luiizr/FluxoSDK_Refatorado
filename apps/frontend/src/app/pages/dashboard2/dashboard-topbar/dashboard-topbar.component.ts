import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-topbar.component.html',
  styleUrl: './dashboard-topbar.component.scss',
})
export class DashboardTopbarComponent {
  protected readonly sites = [
    { id: 'site-1', name: 'Produção', domain: 'app.fluxosdk.com', siteKey: 'pk_demo_fluxosdk' },
    { id: 'site-2', name: 'Staging', domain: 'staging.fluxosdk.com', siteKey: 'pk_stage_fluxosdk' },
  ];

  protected readonly currentUser = this.readCurrentUser();

  protected selectedSiteKey = signal(this.sites[0].siteKey);

  private readCurrentUser() {
    try {
      return {
        name: localStorage.getItem('fluxosdk_user_name') || 'Usuario',
        email: localStorage.getItem('fluxosdk_user_email') || 'usuario@fluxosdk.com',
        isRoot: localStorage.getItem('fluxosdk_user_is_root') === 'true',
      };
    } catch {
      return {
        name: 'Usuario',
        email: 'usuario@fluxosdk.com',
        isRoot: false,
      };
    }
  }
}
