import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loading = false;
  hide = true;
  form: any;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private toast: ToastService,
    private router: Router
  ) {
    this.form = this.fb.group({
      login: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
    });

    // If no admin exists yet, redirect to setup screen
    this.api.get<any>('/setup/status').subscribe({
      next: (res) => {
        if (res?.data?.needsSetup) {
          this.router.navigate(['/auth/setup']);
        }
      },
    });
  }

  submit() {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.api.post<any>('/auth/login', this.form.value).subscribe({
      next: (res) => {
        this.auth.setSession(res.token, res.user);

        // If user must change password, force them to security page
        if (res.user?.mustChangePassword) {
          this.toast.warning('Please change your password before continuing.');
          this.router.navigate(['/settings/security']);
          return;
        }

        // Redirect based on role
        if (res.user?.role === 'cashier') {
          this.router.navigate(['/pos']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }
}