import { Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  templateUrl: './returns.component.html',
  styleUrls: ['./returns.component.scss'],
})
export class ReturnsComponent implements OnInit {
  rows: any[] = [];
  invoiceSearch = '';
  saleResults: any[] = [];
  sale: any = null;
  form: any;

  

  qtyByItemId: Record<number, number> = {};

  displayedColumns = ['invoiceNo','createdAt','grandTotal','actions'];

  constructor(private fb: FormBuilder, private api: ApiService, private toast: ToastService) {
    this.form = this.fb.group({
    reason: [''],
  });
  }

  ngOnInit() {
    this.loadReturns();
  }

  loadReturns() {
    this.api.get<any>('/returns').subscribe(r => this.rows = r.data || []);
  }

  searchSale() {
    const q = this.invoiceSearch.trim();
    if (!q) return;
    this.api.get<any>('/sales', { q, limit: 20 }).subscribe(r => this.saleResults = r.data || []);
  }

  pickSale(r: any) {
    this.api.get<any>(`/sales/${r.id}`).subscribe(s => {
      this.sale = s.data;
      this.qtyByItemId = {};
      for (const it of this.sale.items) this.qtyByItemId[it.id] = 0;
    });
  }

  createReturn() {
    if (!this.sale) return;
    const items = (this.sale.items || [])
      .map((it: any) => ({ it, qty: Number(this.qtyByItemId[it.id] || 0) }))
      .filter((x: any) => x.qty > 0)
      .map((x: any) => ({ productId: x.it.productId, qty: x.qty }));

    if (!items.length) return this.toast.error('Select at least one item quantity');

    this.api.post<any>('/returns', { saleId: this.sale.id, reason: this.form.value.reason, items }).subscribe({
      next: () => {
        this.toast.success('Return created');
        this.sale = null;
        this.saleResults = [];
        this.invoiceSearch = '';
        this.form.reset({ reason: '' });
        this.loadReturns();
      },
    });
  }
}
