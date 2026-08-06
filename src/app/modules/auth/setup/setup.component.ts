import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.scss'],
})
export class SetupComponent {
  loading = false;
  hide = true;
  form: any;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toast: ToastService,
    private router: Router
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9_.-]+$/)]],
      phone: [''],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: any) {
    const pwd = form.get('password')?.value;
    const confirm = form.get('confirmPassword')?.value;
    return pwd === confirm ? null : { passwordMismatch: true };
  }

  submit() {
    if (this.form.invalid || this.loading) return;
    this.loading = true;

    const payload = {
      name: this.form.value.name,
      email: this.form.value.email,
      username: this.form.value.username,
      phone: this.form.value.phone || null,
      password: this.form.value.password,
    };

    this.api.post<any>('/setup/admin', payload).subscribe({
      next: () => {
        this.toast.success('Admin account created. Please login.');
        this.router.navigate(['/auth/login']);
      },
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }
}