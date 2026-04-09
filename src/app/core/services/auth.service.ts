import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';

export type User = { id: number; email: string; name: string; role: 'admin' | 'cashier' };

declare global {
  interface Window {
    medpos?: {
      getVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<boolean>;
      printReceipt: (html: string, options?: any) => Promise<{success: boolean; failureReason?: string | null}>;
    };
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenKey = 'medpos_token';
  private userKey = 'medpos_user';

  private _isLoggedIn$ = new BehaviorSubject<boolean>(!!localStorage.getItem(this.tokenKey));
  isLoggedIn$ = this._isLoggedIn$.asObservable();

  private _user$ = new BehaviorSubject<User | null>(this.readUser());
  user$ = this._user$.asObservable();

  version = '1.0.0';

  constructor() {
    this.loadVersion();
  }

  private async loadVersion() {
    try {
      const v = await window.medpos?.getVersion?.();
      if (v) this.version = v;
    } catch {}
  }

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  setSession(token: string, user: User) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this._user$.next(user);
    this._isLoggedIn$.next(true);
  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this._user$.next(null);
    this._isLoggedIn$.next(false);
  }

  private readUser(): User | null {
    try {
      const raw = localStorage.getItem(this.userKey);
      return raw ? JSON.parse(raw) as User : null;
    } catch {
      return null;
    }
  }

  hasRole(...roles: User['role'][]) {
    return this.user$.pipe(map(u => !!u && roles.includes(u.role)));
  }
}
