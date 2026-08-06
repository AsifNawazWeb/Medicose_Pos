import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { ApiService } from './core/services/api.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  storeName: string = '';
  storeAddress: string = '';
  isAuthPage = false;

  constructor(
    public auth: AuthService,
    private router: Router,
    public theme: ThemeService,
    private api: ApiService
  ) {
    // Track whether we're on an auth page (login/setup) to hide the shell
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      this.isAuthPage = e.url.startsWith('/auth');
    });

    auth.isLoggedIn$.subscribe(isLoggedIn => {
      if (!isLoggedIn) {
        // Check if setup is needed (no admin exists yet) → show setup screen
        this.api.get<any>('/setup/status').subscribe({
          next: (res) => {
            if (res?.data?.needsSetup) {
              this.router.navigate(['/auth/setup']);
            } else {
              this.router.navigate(['/auth/login']);
            }
          },
          error: () => this.router.navigate(['/auth/login']),
        });
      }
    });
  }

  ngOnInit() {
    this.api.get<any>('/settings').subscribe(r => {
      const s = r.data;
      this.storeName = s.storeName || '';
      this.storeAddress = s.storeAddress || '';
    });
  }

  toggleTheme() {
    this.theme.toggle();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
