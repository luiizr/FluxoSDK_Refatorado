import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../services/auth.service';
import { SiteService, Site } from '../../../services/site.service';

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
  private readonly siteService = inject(SiteService);

  protected readonly sites = signal<Site[]>([]);

  protected readonly currentUser = signal<CurrentUserView>({
    name: 'Usuario',
    email: 'usuario@fluxosdk.com',
  });
  protected selectedSiteKey = signal<string | null>(null);

  async ngOnInit() {
    const user = await this.authService.getCurrentUser();
    if (user) {
      this.currentUser.set({
        name: user.name || 'Usuario',
        email: user.email,
      });
    }

    try {
      const realSites = await this.siteService.list();
      this.sites.set(realSites);
      if (realSites.length > 0) {
        this.selectedSiteKey.set(realSites[0].public_key || null);
      }
    } catch (err) {
      console.error('Erro ao carregar sites no topbar', err);
    }
  }
}
