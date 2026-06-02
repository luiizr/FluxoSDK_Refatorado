import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard-sidebar.component.html',
  styleUrl: './dashboard-sidebar.component.scss',
})
export class DashboardSidebarComponent {
  private readonly router = inject(Router);

  protected logout() {
    localStorage.removeItem('fluxosdk_user_id');
    localStorage.removeItem('fluxosdk_user_name');
    localStorage.removeItem('fluxosdk_user_email');
    localStorage.removeItem('fluxosdk_user_is_root');
    void this.router.navigate(['/']);
  }
}
