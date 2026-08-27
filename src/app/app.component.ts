import { Component, OnInit } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';
import { ApiService } from './core/services/api.service';
import { UpdateService, UpdateState, UpdateStatus } from './core/services/update.service';
import { ToastService } from './core/services/toast.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  storeName: string = '';
  storeAddress: string = '';
  isAuthPage = false;
  updateState: UpdateState = { status: 'idle' };
  private updateDismissed = false;
  private prevUpdateStatus: UpdateStatus = 'idle';

  constructor(
    public auth: AuthService,
    private router: Router,
    public theme: ThemeService,
    private api: ApiService,
    private updates: UpdateService,
    private toast: ToastService
  ) {
    // Track update progress; re-show the banner whenever the phase changes
    this.updates.state$.subscribe(s => {
      if (s.status !== this.prevUpdateStatus) {
        this.updateDismissed = false;
        this.prevUpdateStatus = s.status;
      }
      this.updateState = s;
    });

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

  get showUpdateBanner(): boolean {
    const st = this.updateState.status;
    return !this.updateDismissed && (st === 'available' || st === 'downloading' || st === 'downloaded');
  }

  toggleTheme() {
    this.theme.toggle();
  }

  checkForUpdates() {
    this.updates.check().then(s => {
      if (s.status === 'disabled') {
        this.toast.info('Updates are only available in the installed desktop app');
      } else if (s.status === 'not-available') {
        this.toast.success("You're on the latest version");
      } else if (s.status === 'error') {
        this.toast.error(s.error || 'Update check failed');
      }
    });
  }

  dismissUpdate() {
    this.updateDismissed = true;
  }

  installUpdate() {
    this.updates.install();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/auth/login']);
  }
}
