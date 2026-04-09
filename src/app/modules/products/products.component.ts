import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';

@Component({ templateUrl: './products.component.html', styleUrls: ['./products.component.scss'] })
export class ProductsComponent implements OnInit {
  @ViewChild('productDialog') productDialog!: TemplateRef<any>;
  @ViewChild('qtyDialog') qtyDialog!: TemplateRef<any>;

  categories = ['Tablet', 'Capsule', 'Injection', 'Syrup', 'Cream', 'Drops', 'Ointment', 'Powder', 'Strip', 'Other'];
  categoryFilter = '';
  stockFilter = '';
  // Generate shelves A1–M100
  shelves: string[] = [];

  q = '';
  rows: any[] = [];
  filteredRows: any[] = [];
  suppliers: any[] = [];
  editing: any = null;
  editingProduct: any = null;
  newQty: number = 0;
  form: any;

  displayedColumns = ['name', 'category', 'shelf', 'batchNo', 'stock', 'price', 'expiryDate', 'status', 'actions'];

  constructor(private fb: FormBuilder, private api: ApiService, private toast: ToastService, private dialog: MatDialog) {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      sku: [''],
      barcode: [''],
      category: ['Tablet', Validators.required],
      batchNo: [''],
      unit: ['pcs'],
      price: [0, [Validators.required, Validators.min(0)]],
      cost: [0, Validators.min(0)],
      gstRate: [0, [Validators.min(0), Validators.max(100)]],
      stockQty: [0, Validators.min(0)],
      reorderLevel: [10, Validators.min(0)],
      expiryDate: [''],
      supplierId: [null],
      isActive: [true],
      shelf: ['', Validators.required],
      productDiscount: [0, [Validators.min(0), Validators.max(100)]],
      unitsPerStrip:   [1, [Validators.min(1)]],
      stripsPerBox:    [1, [Validators.min(1)]],
      packagingUnit:   ['unit'],
    });
  }

  ngOnInit() {
    this.createShelfArray()
    this.load();
    this.api.get<any>('/suppliers').subscribe(r => this.suppliers = r.data || []);
  }

  load() {
    this.api.get<any>('/products', { q: this.q, category: this.categoryFilter })
      .subscribe(r => { this.rows = r.data || []; this.applyStockFilter(); });
  }

  applyStockFilter() {
    const now = new Date();
    const in30 = new Date(); in30.setDate(now.getDate() + 30);
    this.filteredRows = this.rows.filter(r => {
      if (!this.stockFilter) return true;
      if (this.stockFilter === 'out') return r.stockQty <= 0;
      if (this.stockFilter === 'low') return r.stockQty > 0 && r.stockQty <= r.reorderLevel;
      if (this.stockFilter === 'expiring') { if (!r.expiryDate) return false; const e = new Date(r.expiryDate); return e >= now && e <= in30; }
      if (this.stockFilter === 'active') return r.stockQty > r.reorderLevel && !this.isExpiringSoon(r.expiryDate);
      return true;
    });
  }

  isExpiringSoon(date: string): boolean {
    if (!date) return false;
    const now = new Date(); const e = new Date(date);
    const in30 = new Date(); in30.setDate(now.getDate() + 30);
    return e >= now && e <= in30;
  }

  statusClass(r: any): string {
    if (r.stockQty <= 0) return 'chip-red';
    if (r.stockQty <= r.reorderLevel) return 'chip-amber';
    if (this.isExpiringSoon(r.expiryDate)) return 'chip-amber';
    return 'chip-green';
  }

  statusLabel(r: any): string {
    if (r.stockQty <= 0) return 'Out of Stock';
    if (r.stockQty <= r.reorderLevel) return 'Low Stock';
    if (this.isExpiringSoon(r.expiryDate)) return 'Expiring Soon';
    return 'In Stock';
  }

  openModal(row?: any) {
    this.editing = row ?? null;
    if (row) {
      this.form.patchValue({ ...row, isActive: row.isActive === 1 || row.isActive === true, supplierId: row.supplierId ?? null, expiryDate: row.expiryDate || '', shelf: row.shelf || '', productDiscount: row.productDiscount || 0, unitsPerStrip: row.unitsPerStrip || 1, stripsPerBox: row.stripsPerBox || 1, packagingUnit: row.packagingUnit || 'unit' });
    } else {
      this.form.reset({ name: '', sku: '', barcode: '', category: 'Tablet', batchNo: '', unit: 'pcs', price: 0, cost: 0, gstRate: 0, stockQty: 0, reorderLevel: 10, expiryDate: '', supplierId: null, isActive: true, productDiscount: 0, unitsPerStrip: 1, stripsPerBox: 1, packagingUnit: 'unit' });
    }
    this.dialog.open(this.productDialog, { width: '720px', maxWidth: '98vw' });
  }

  openQtyModal(row: any) {
    this.editingProduct = row;
    this.newQty = row.stockQty;
    this.dialog.open(this.qtyDialog, { width: '400px', maxWidth: '95vw' });
  }

  save() {
    if (this.form.invalid) {
      this.toast.warning('Please fill all required fields correctly');
      return;
    }
    const req = this.editing
      ? this.api.put<any>(`/products/${this.editing.id}`, this.form.value)
      : this.api.post<any>('/products', this.form.value);
    req.subscribe({
      next: () => {
        this.toast.success(this.editing ? 'Product updated successfully' : 'Product added successfully');
        this.dialog.closeAll();
        this.load();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to save product');
      }
    });
  }

  saveQty() {
    if (!this.editingProduct || this.newQty < 0) {
      this.toast.warning('Please enter a valid quantity');
      return;
    }
    this.api.patch<any>(
      `/products/${this.editingProduct.id}/stock`,
      { stockQty: this.newQty }
    ).subscribe({
      next: () => {
        this.toast.success('Quantity updated successfully');
        this.dialog.closeAll();
        this.load();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to update quantity');
      }
    });
  }

  remove(row: any) {
    if (!confirm('Delete this product permanently?')) return;
    this.api.delete<any>(`/products/${row.id}`).subscribe({
      next: () => {
        this.toast.success('Product deleted successfully');
        this.load();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Failed to delete product');
      }
    });
  }


  createShelfArray() {
    const rows = 'ABCDEFGHIJKLM'; // 13 rows
    const totalColumns = 100;

    for (let i = 0; i < rows.length; i++) {
      for (let col = 1; col <= totalColumns; col++) {
        this.shelves.push(`${rows[i]}${col}`);
      }
    }

  }
}
