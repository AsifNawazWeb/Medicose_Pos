import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { MatDialog } from '@angular/material/dialog';

type Line = { productId: number; qty: number; cost?: number };

@Component({
  templateUrl: './purchase-orders.component.html',
  styleUrls: ['./purchase-orders.component.scss'],
})
export class PurchaseOrdersComponent implements OnInit {
  @ViewChild('supplierDialog') supplierDialog!: TemplateRef<any>;
  rows: any[] = [];
  suppliers: any[] = [];
  products: any[] = [];

  lines: Line[] = [];
  form: any;

 

  constructor(private fb: FormBuilder, private api: ApiService, private toast: ToastService, private dialog: MatDialog) {
     this.form = this.fb.group({
    supplierId: [null, Validators.required],
  });
  }

  ngOnInit() {
    this.load();
    this.api.get<any>('/suppliers').subscribe(r => this.suppliers = r.data || []);
    this.api.get<any>('/products', { limit: 200 }).subscribe(r => this.products = r.data || []);
    this.addLine();
  }

  load() {
    this.api.get<any>('/purchase-orders').subscribe(r => this.rows = r.data || []);
  }

  addLine() {
    const first = this.products[0]?.id ?? null;
    if (first == null) {
      this.lines.push({ productId: 0, qty: 1 });
      return;
    }
    this.lines.push({ productId: first, qty: 1 });
  }

  removeLine(i: number) {
    this.lines.splice(i, 1);
  }

  create() {
    if (this.form.invalid) return;
    const items = this.lines.filter(x => x.productId && x.qty > 0).map(x => ({ productId: x.productId, qty: x.qty, cost: x.cost || 0 }));
    if (!items.length) return this.toast.error('Add at least one item');

    this.api.post<any>('/purchase-orders', { supplierId: this.form.value.supplierId, items }).subscribe({
      next: () => {
        this.toast.success('Purchase order created');
        this.lines = [];
        this.addLine();
        this.form.reset({ supplierId: null });
        this.load();
      },
    });
  }

  receive(row: any) {
    if (!confirm('Mark as RECEIVED and update stock?')) return;
    this.api.post<any>(`/purchase-orders/${row.id}/receive`, {}).subscribe({
      next: () => { this.toast.success('Received'); this.load(); },
    });
  }

  productName(id: number) {
    return this.products.find(p => p.id === id)?.name || String(id);
  }

  openModal(customer?: any) {
      this.form.reset({
        name: '',
        phone: '',
        email: '',
        address: '',
        loyaltyPoints: ''
      });

    this.dialog.open(this.supplierDialog, { width: '600px', maxWidth: '95vw' });
  }

}
