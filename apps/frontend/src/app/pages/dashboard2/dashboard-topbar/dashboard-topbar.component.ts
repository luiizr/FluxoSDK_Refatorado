import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';

type CurrentUserView = {
  name: string;
  email: string;
};

@Component({
  selector: 'app-dashboard-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-topbar.component.html',
  styleUrl: './dashboard-topbar.component.scss',
})
export class DashboardTopbarComponent implements OnInit {
  private readonly authService = inject(AuthService);

  protected readonly sites = [
    { id: 'site-1', name: 'Produção', domain: 'app.fluxosdk.com', siteKey: 'pk_demo_fluxosdk' },
    { id: 'site-2', name: 'Staging', domain: 'staging.fluxosdk.com', siteKey: 'pk_stage_fluxosdk' },
  ];

  protected readonly currentUser = signal<CurrentUserView>({
    name: 'Usuario',
    email: 'usuario@fluxosdk.com',
  });
  protected selectedSiteKey = signal(this.sites[0].siteKey);

  async ngOnInit() {
    const user = await this.authService.getCurrentUser();
    if (user) {
      this.currentUser.set({
        name: user.name || 'Usuario',
        email: user.email,
      });
    }
  }
}
