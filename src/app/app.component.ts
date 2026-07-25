import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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

  constructor(
    public auth: AuthService,
    private router: Router,
    public theme: ThemeService,
    private api: ApiService
  ) {
    auth.isLoggedIn$.subscribe(isLoggedIn => {
      if (!isLoggedIn) {
        this.router.navigate(['/auth/login']);
      }
    });
  }

  ngOnInit() {
    this.api.get<any>('/settings').subscribe(r => {
      const s = r.data;
      this.storeName = s.storeName || '';
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
