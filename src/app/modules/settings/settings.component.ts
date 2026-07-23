import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { environment } from '../../../environments/environment';

@Component({
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  loading = false;
  backupLoading = false;
  restoreLoading = false;
  form: any;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toast: ToastService,
    private http: HttpClient
  ) {
    this.form = this.fb.group({
      storeName: ['', [Validators.required, Validators.minLength(2)]],
      storePhone: [''],
      storeAddress: [''],
      receiptFooter: [''],
      gstEnabled: [true],
    });
  }

  ngOnInit() {
    this.api.get<any>('/settings').subscribe(r => {
      const s = r.data;
      this.form.patchValue({
        storeName: s.storeName,
        storePhone: s.storePhone,
        storeAddress: s.storeAddress,
        receiptFooter: s.receiptFooter,
        gstEnabled: !!s.gstEnabled,
      });
    });
  }

  save() {
    if (this.form.invalid || this.loading) return;
    this.loading = true;
    this.api.put<any>('/settings', this.form.value).subscribe({
      next: () => this.toast.success('Settings saved'),
      error: () => (this.loading = false),
      complete: () => (this.loading = false),
    });
  }

  backupDatabase() {
    if (this.backupLoading) return;
    this.backupLoading = true;
    this.http.get(`${environment.apiBaseUrl}/settings/backup`, {
      responseType: 'blob',
      observe: 'response',
    }).subscribe({
      next: (response: any) => {
        const blob = response.body;
        const contentDisposition = response.headers.get('Content-Disposition');
        let filename = 'medical_pos_backup.sqlite';
        if (contentDisposition) {
          const match = contentDisposition.match(/filename="?(.+?)"?$/);
          if (match) filename = match[1];
        }
        // Trigger browser download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        this.toast.success('Database backup downloaded successfully');
        this.backupLoading = false;
      },
      error: (err) => {
        console.error('Backup failed:', err);
        this.toast.error('Failed to create backup');
        this.backupLoading = false;
      },
    });
  }

  onRestoreFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    if (!confirm('Are you sure you want to restore this backup? All current data will be replaced. The application may need to be restarted after restore.')) {
      input.value = '';
      return;
    }

    this.restoreLoading = true;
    const formData = new FormData();
    formData.append('backupFile', file);

    this.http.post<any>(`${environment.apiBaseUrl}/settings/restore`, formData).subscribe({
      next: (r) => {
        this.toast.success(r?.data?.message || 'Database restored successfully. Please restart the application.');
        this.restoreLoading = false;
        input.value = '';
      },
      error: (err) => {
        console.error('Restore failed:', err);
        this.toast.error(err?.error?.error?.message || 'Failed to restore database');
        this.restoreLoading = false;
        input.value = '';
      },
    });
  }
}
