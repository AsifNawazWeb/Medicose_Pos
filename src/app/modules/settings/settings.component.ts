import { Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent implements OnInit {
  loading = false;
  form: any;

  

  constructor(private fb: FormBuilder, private api: ApiService, private toast: ToastService) {
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
}
