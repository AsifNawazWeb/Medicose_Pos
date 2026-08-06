import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Role } from '../services/auth.service';

/**
 * Role-based route guard.
 * Usage: canActivate: [roleGuard('admin', 'manager')]
 */
export function roleGuard(...allowedRoles: Role[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (auth.hasRole(...allowedRoles)) return true;

    // Redirect to dashboard (or POS for cashier) if not authorized
    const user = auth.currentUser;
    if (user?.role === 'cashier') {
      router.navigate(['/pos']);
    } else {
      router.navigate(['/dashboard']);
    }
    return false;
  };
}