import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './core/services/auth.service';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent {
  constructor(public auth: AuthService, private router: Router, public theme: ThemeService) {
    auth.isLoggedIn$.subscribe(isLoggedIn => {
      if (!isLoggedIn) {
        this.router.navigate(['/auth/login']);
      }
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
