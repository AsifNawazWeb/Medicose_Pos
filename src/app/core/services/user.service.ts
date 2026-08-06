import { Injectable } from '@angular/core';
import { ApiService } from './api.service';
import { Role } from './auth.service';

export interface UserRecord {
  id: number;
  email: string;
  username: string;
  name: string;
  role: Role;
  phone?: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface RoleOption {
  value: Role;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private api: ApiService) {}

  list() {
    return this.api.get<{ ok: boolean; data: UserRecord[] }>('/users');
  }

  create(payload: { name: string; email: string; username: string; password: string; role: Role; phone?: string }) {
    return this.api.post<{ ok: boolean; user: UserRecord }>('/users', payload);
  }

  update(id: number, payload: { name?: string; phone?: string; role?: Role; isActive?: boolean }) {
    return this.api.put<{ ok: boolean; user: UserRecord }>(`/users/${id}`, payload);
  }

  setActive(id: number, isActive: boolean) {
    return this.api.patch<{ ok: boolean }>(`/users/${id}/active`, { isActive });
  }

  resetPassword(id: number, newPassword: string) {
    return this.api.post<{ ok: boolean; message: string }>(`/users/${id}/reset-password`, { newPassword });
  }

  getRoles() {
    return this.api.get<{ ok: boolean; data: RoleOption[] }>('/users/roles');
  }
}