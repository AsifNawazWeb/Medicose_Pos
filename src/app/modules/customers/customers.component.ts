import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  templateUrl: './customers.component.html',
  styleUrls: ['./customers.component.scss'],
})
export class CustomersComponent implements OnInit {
  @ViewChild('supplierDialog') supplierDialog!: TemplateRef<any>;
  @ViewChild('purchasesDialog') purchasesDialog!: TemplateRef<any>;

  rows: any[] = [];
  editing: any = null;
  form: any;
  purchases: any[] = [];
  selectedCustomer: any = null;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private toast: ToastService,
    private dialog: MatDialog
  ) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      phone: [''],
      email: [''],
      address: [''],
      loyaltyPoints: [0, [Validators.min(0), Validators.max(9)]]
    });
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.api.get<any>('/customers').subscribe({
      next: (r) => {
        this.rows = r.data || [];
      },
      error: (err) => {
        this.toast.error('Failed to load suppliers');
      }
    });
  }

  openModal(customer?: any) {
    this.editing = customer ?? null;

    if (customer) {
      this.form.patchValue({
        name: customer.name || '',
        phone: customer.phone || '',
        email: customer.email || '',
        address: customer.address || '',
        loyaltyPoints: customer.loyaltyPoints || ''
      });
    } else {
      this.form.reset({
        name: '',
        phone: '',
        email: '',
        address: '',
        loyaltyPoints: ''
      });
    }

    this.dialog.open(this.supplierDialog, { width: '600px', maxWidth: '95vw' });
  }

  save() {
    if (this.form.invalid) {
      this.toast.warning('Please fill in all required fields');
      return;
    }

    const payload = { ...this.form.value };
    // Sanitize: empty email → null (Zod .email() rejects empty string)
    if (!payload.email) payload.email = null;
    // Sanitize: empty loyaltyPoints → 0 (Zod .number() rejects empty string)
    if (payload.loyaltyPoints === '' || payload.loyaltyPoints === null || payload.loyaltyPoints === undefined) {
      payload.loyaltyPoints = 0;
    }

    const req = this.editing
      ? this.api.put<any>(`/customers/${this.editing.id}`, payload)
      : this.api.post<any>('/customers', payload);

    req.subscribe({
      next: () => {
        this.toast.success(this.editing ? 'Customers updated successfully' : 'Customers added successfully');
        this.dialog.closeAll();
        this.load();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to save customer');
      }
    });
  }

  remove(customer: any) {
    if (!confirm(`Delete customer "${customer.name}"?`)) return;

    this.api.delete<any>(`/customers/${customer.id}`).subscribe({
      next: () => {
        this.toast.success('Supplier deleted successfully');
        this.load();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete customer');
      }
    });
  }

  viewPurchases(customer: any) {
    this.selectedCustomer = customer;
    this.api.get<any>(`/customers/${customer.id}/sales`).subscribe({
      next: (r) => {
        this.purchases = r.data || [];
        this.dialog.open(this.purchasesDialog, { width: '800px', maxWidth: '95vw' });
      },
      error: (err) => {
        this.toast.error('Failed to load purchase history');
      }
    });
  }

  limitToOneDigit(event: any) {
    let value = event.target.value;
    if (value.length > 1) {
      event.target.value = value.slice(0, 1);
    }
  }
}
