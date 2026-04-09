import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/services/api.service';

@Component({
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
})
export class RegisterComponent {
  loading = false;
  form: any;

  

  constructor(private fb: FormBuilder, private api: ApiService, private router: Router) {
    this.form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });
  }

  submit() {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.api.post<any>('/auth/register', this.form.value).subscribe({
      next: () => this.router.navigate(['/auth/login']),
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }
}
