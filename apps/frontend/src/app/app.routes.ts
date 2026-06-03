import { Route } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { authGuard, guestGuard } from './guards/auth.guard';

import { DashboardComponent } from './pages/dashboard2/dashboard.component';
import { OverviewComponent } from './pages/dashboard2/overview/overview.component';
import { LogsComponent } from './pages/dashboard2/logs/logs.component';
import { SessionsComponent } from './pages/dashboard2/sessions/sessions.component';
import { KpisComponent } from './pages/dashboard2/kpis/kpis.component';
import { SettingsComponent } from './pages/dashboard2/settings/settings.component';
import { AdminComponent } from './pages/dashboard2/admin/admin.component';

export const appRoutes: Route[] = [
  {
    path: '',
    component: AuthComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      { path: 'overview', component: OverviewComponent },
      { path: 'logs', component: LogsComponent },
      { path: 'sessions', component: SessionsComponent },
      { path: 'kpis', component: KpisComponent },
      { path: 'settings', component: SettingsComponent },
      { path: 'admin', component: AdminComponent },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
