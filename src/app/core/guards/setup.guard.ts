import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ApiService } from '../services/api.service';
import { map } from 'rxjs/operators';

/**
 * Guard for the /auth/setup route.
 * Allows access only if no admin user exists (needs setup).
 * If setup is already done, redirects to login.
 */
export const setupGuard: CanActivateFn = () => {
  const api = inject(ApiService);
  const router = inject(Router);

  return api.get<any>('/setup/status').pipe(
    map((res) => {
      if (res?.data?.needsSetup) return true;
      router.navigate(['/auth/login']);
      return false;
    })
  );
};