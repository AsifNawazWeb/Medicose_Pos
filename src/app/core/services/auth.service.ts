import { Injectable } from '@angular/core';
import { BehaviorSubject, map } from 'rxjs';
import type { UpdateState } from './update.service';

export type Role = 'admin' | 'manager' | 'cashier' | 'viewer';

export interface User {
  id: number;
  email: string;
  username: string;
  name: string;
  role: Role;
  phone?: string;
  mustChangePassword?: boolean;
  isActive?: boolean;
}

declare global {
  interface Window {
    medpos?: {
      getVersion: () => Promise<string>;
      openExternal: (url: string) => Promise<boolean>;
      printReceipt: (html: string, options?: any) => Promise<{success: boolean; failureReason?: string | null}>;
      update?: {
        check: () => Promise<UpdateState>;
        getState: () => Promise<UpdateState>;
        install: () => Promise<boolean>;
        onStatus: (cb: (state: UpdateState) => void) => () => void;
      };
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

  get currentUser(): User | null {
    return this._user$.getValue();
  }

  setSession(token: string, user: User) {
    localStorage.setItem(this.tokenKey, token);
    localStorage.setItem(this.userKey, JSON.stringify(user));
    this._user$.next(user);
    this._isLoggedIn$.next(true);
  }

  updateUser(user: Partial<User>) {
    const current = this.currentUser;
    if (!current) return;
    const updated = { ...current, ...user };
    localStorage.setItem(this.userKey, JSON.stringify(updated));
    this._user$.next(updated);
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

  /** Sync check — returns true if current user has any of the given roles */
  hasRole(...roles: Role[]): boolean {
    const user = this.currentUser;
    return !!user && roles.includes(user.role);
  }

  /** Observable version of hasRole */
  hasRole$(...roles: Role[]) {
    return this.user$.pipe(map(u => !!u && roles.includes(u.role)));
  }
}