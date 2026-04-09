import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../../core/services/api.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  templateUrl: './security.component.html',
  styleUrls: ['./security.component.scss'],
})
export class SecurityComponent {
  loading = false;
  form: any;

  

  constructor(private fb: FormBuilder, private api: ApiService, private toast: ToastService) {
    this.form = this.fb.group({
    oldPassword: ['', [Validators.required, Validators.minLength(6)]],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
  });
  }

  save() {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.api.post<any>('/auth/change-password', this.form.value).subscribe({
      next: () => {
        this.toast.success('Password updated');
        this.form.reset({ oldPassword: '', newPassword: '' });
      },
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }
}
