import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const isAuthenticated = await authService.validateSession();

  if (isAuthenticated) {
    return true;
  }

  return router.navigate(['/']);
};

export const guestGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const isAuthenticated = await authService.validateSession();

  if (!isAuthenticated) {
    return true;
  }

  return router.navigate(['/dashboard']);
};
