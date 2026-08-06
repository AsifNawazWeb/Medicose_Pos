import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { ApiService } from '../services/api.service';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const api = inject(ApiService);

  if (auth.token) return true;

  // Not logged in — check if setup is needed (no admin exists yet)
  return api.get<any>('/setup/status').pipe(
    map((res) => {
      if (res?.data?.needsSetup) {
        router.navigate(['/auth/setup']);
      } else {
        router.navigate(['/auth/login']);
      }
      return false;
    })
  );
};
