import { Component, OnInit, ViewChild, TemplateRef, OnDestroy, ElementRef, AfterViewInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ApiService } from '../../core/services/api.service';
import { ToastService } from '../../core/services/toast.service';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';
import JsBarcode from 'jsbarcode';

@Component({ templateUrl: './products.component.html', styleUrls: ['./products.component.scss'] })
export class ProductsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('productDialog') productDialog!: TemplateRef<any>;
  @ViewChild('qtyDialog') qtyDialog!: TemplateRef<any>;
  @ViewChild('barcodeSvg') barcodeSvg!: ElementRef<SVGSVGElement>;

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

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

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
      stockQty: [0, Validators.min(0)],
      reorderLevel: [10, Validators.min(0)],
      expiryDate: [null],
      supplierId: [null],
      isActive: [true],
      shelf: [''],
      productDiscount: [0, [Validators.min(0), Validators.max(100)]],
      unitsPerStrip:   [1, [Validators.min(1)]],
      stripsPerBox:    [1, [Validators.min(1)]],
      packagingUnit:   ['unit'],
    });
  }

  ngOnInit() {
    this.createShelfArray()
    this.load();

    // Debounced search with barcode detection
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      this.performSearch(query);
    });

    this.api.get<any>('/suppliers').subscribe(r => this.suppliers = r.data || []);
  }

  ngAfterViewInit() {
    // Subscribe to barcode value changes to re-render the barcode image
    this.form.get('barcode').valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((value: string) => {
        this.renderBarcode(value);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Called from template on (input) — feeds the debounced subject */
  onSearchInput(value: string) {
    this.q = value;
    this.searchSubject.next(value.trim());
  }

  /**
   * Performs the actual search. If the query looks like a barcode (all digits,
   * length >= 8), first tries the exact scan endpoint. On exact match, opens
   * the product in edit mode. Otherwise falls back to the generic LIKE search.
   */
  private performSearch(query: string) {
    if (!query) {
      this.api.get<any>('/products', { q: '', category: this.categoryFilter })
        .subscribe(r => { this.rows = r.data || []; this.applyStockFilter(); });
      return;
    }

    // Detect barcode-like input: all digits, at least 8 characters
    const isBarcodeLike = /^\d{8,}$/.test(query);

    if (isBarcodeLike) {
      // Try exact barcode match first
      this.api.get<any>(`/products/scan/${encodeURIComponent(query)}`).subscribe({
        next: (r) => {
          if (r?.data) {
            // Exact barcode match — open product in edit mode
            this.rows = [r.data];
            this.applyStockFilter();
            this.openModal(r.data);
            return;
          }
          // No exact match — fall back to LIKE search
          this.doGenericSearch(query);
        },
        error: () => this.doGenericSearch(query)
      });
    } else {
      this.doGenericSearch(query);
    }
  }

  private doGenericSearch(query: string) {
    this.api.get<any>('/products', { q: query, category: this.categoryFilter })
      .subscribe(r => { this.rows = r.data || []; this.applyStockFilter(); });
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

  /**
   * Generates a valid 13-digit EAN-13 barcode.
   * First 12 digits are random, 13th is the check digit.
   */
  generateEAN13Barcode(): string {
    // Generate 12 random digits
    let digits = '';
    for (let i = 0; i < 12; i++) {
      digits += Math.floor(Math.random() * 10).toString();
    }

    // Calculate EAN-13 check digit
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(digits[i], 10);
      // Odd positions (1-indexed) have weight 1, even positions have weight 3
      sum += (i % 2 === 0) ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;

    return digits + checkDigit.toString();
  }

  /**
   * Renders the barcode using JsBarcode.
   * Uses EAN13 format for 12+ digit codes, CODE128 for shorter codes.
   */
  renderBarcode(value: string) {
    if (!value || !this.barcodeSvg) {
      return;
    }

    try {
      const format = value.length >= 12 ? 'EAN13' : 'CODE128';
      JsBarcode(this.barcodeSvg.nativeElement, value, {
        format: format,
        width: 2,
        height: 38,
        displayValue: true,
        fontSize: 12,
        margin: 3,
        background: '#ffffff',
      });
    } catch (e) {
      // Silently fail if barcode can't be rendered (e.g. invalid characters)
    }
  }

  openModal(row?: any) {
    this.editing = row ?? null;
    if (row) {
      // Convert expiryDate string to Date object for matDatepicker, or null if empty
      const expiryVal = row.expiryDate ? new Date(row.expiryDate) : null;
      this.form.patchValue({
        ...row,
        isActive: row.isActive === 1 || row.isActive === true,
        supplierId: row.supplierId ?? null,
        expiryDate: expiryVal,
        shelf: row.shelf || '',
        productDiscount: row.productDiscount || 0,
        unitsPerStrip: row.unitsPerStrip || 1,
        stripsPerBox: row.stripsPerBox || 1,
        packagingUnit: row.packagingUnit || 'unit',
      });
    } else {
      // Generate a new barcode for new products
      const newBarcode = this.generateEAN13Barcode();
      this.form.reset({
        name: '', sku: '', barcode: newBarcode, category: 'Tablet', batchNo: '', unit: 'pcs',
        price: 0, cost: 0, stockQty: 0, reorderLevel: 10,
        expiryDate: null, supplierId: null, isActive: true, shelf: '',
        productDiscount: 0, unitsPerStrip: 1, stripsPerBox: 1, packagingUnit: 'unit',
      });
    }
    const dialogRef = this.dialog.open(this.productDialog, { width: '720px', maxWidth: '98vw' });
    // Render barcode after dialog opens and SVG element exists in DOM
    dialogRef.afterOpened().subscribe(() => {
      setTimeout(() => {
        this.renderBarcode(this.form.get('barcode').value);
      });
    });
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
    // Convert Date to ISO string for the backend
    const payload = { ...this.form.value };
    if (payload.expiryDate instanceof Date) {
      payload.expiryDate = payload.expiryDate.toISOString().split('T')[0];
    }
    const req = this.editing
      ? this.api.put<any>(`/products/${this.editing.id}`, payload)
      : this.api.post<any>('/products', payload);
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