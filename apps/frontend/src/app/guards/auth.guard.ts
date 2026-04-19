import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const isAuthenticated = !!localStorage.getItem('fluxosdk_user_id');

  if (isAuthenticated) {
    return true;
  }

  return router.navigate(['/auth']);
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const isAuthenticated = !!localStorage.getItem('fluxosdk_user_id');

  if (!isAuthenticated) {
    return true;
  }

  return router.navigate(['/dashboard']);
};
