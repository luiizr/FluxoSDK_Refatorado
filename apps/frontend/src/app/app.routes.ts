import { Route } from '@angular/router';
import { LandingComponent } from './pages/landing/landing.component';
import { AuthComponent } from './pages/auth/auth.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard, guestGuard } from './guards/auth.guard';

export const appRoutes: Route[] = [
  {
    path: '',
    component: LandingComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'auth',
    component: AuthComponent,
    canActivate: [guestGuard],
  },
  {
    path: 'dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '',
  },
];
