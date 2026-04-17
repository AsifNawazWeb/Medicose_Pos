import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  loading = false;
  form: any

 

  constructor(private fb: FormBuilder, private api: ApiService, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });
  }

  submit() {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.api.post<any>('/auth/login', this.form.value).subscribe({
      next: (res) => {
        this.auth.setSession(res.token, res.user);
        this.router.navigate(['/dashboard']);
      },
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }
}
