import { Injectable } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly key = 'medpos_theme';
  private mode: ThemeMode = 'light';

  constructor() {
    const saved = (localStorage.getItem(this.key) as ThemeMode) || 'light';
    this.set(saved);
  }

  get current(): ThemeMode {
    return this.mode;
  }

  toggle() {
    this.set(this.mode === 'dark' ? 'light' : 'dark');
  }

  set(mode: ThemeMode) {
    this.mode = mode;
    try { localStorage.setItem(this.key, mode); } catch {}
    const root = document.documentElement;
    root.classList.remove('theme-dark', 'theme-light');
    root.classList.add(mode === 'dark' ? 'theme-dark' : 'theme-light');
  }
}
