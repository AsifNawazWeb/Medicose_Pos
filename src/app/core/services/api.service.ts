import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  get<T>(path: string, params?: any) {
    return this.http.get<T>(`${this.base}${path}`, { params });
  }
  post<T>(path: string, body?: any) {
    return this.http.post<T>(`${this.base}${path}`, body);
  }
  put<T>(path: string, body?: any) {
    return this.http.put<T>(`${this.base}${path}`, body);
  }
  delete<T>(path: string) {
    return this.http.delete<T>(`${this.base}${path}`);
  }

  patch<T>(path: string, body?: any) {
    return this.http.patch<T>(`${this.base}${path}`, body);
  }
}
