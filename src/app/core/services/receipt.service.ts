import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReceiptService {

  buildHtml(data: any): string {
    const storeName    = esc(data.storeName    || 'Medical Store');
    const storeAddress = esc(data.storeAddress || '');
    const storePhone   = esc(data.storePhone   || '');
    const footer       = esc(data.receiptFooter || 'Thank you for your purchase!');
    const invoiceNo    = esc(data.invoiceNo    || 'N/A');
    const createdAt    = formatDate(data.createdAt);
    const customerName = esc(data.customerName || '');
    const customerPhone= esc(data.customerPhone|| '');
    const payMethod    = esc(data.paymentMethod|| 'CASH');

    const items        = data.items || [];
    const subTotal     = Number(data.subTotal    || 0);
    const gstTotal     = Number(data.gstTotal    || 0);
    const discountAmt  = Number(data.discount    || 0);   // sum of product discounts
    const extraDiscAmt = Number(data.extraDiscount|| 0);  // sum of extra discounts
    const billDiscAmt  = Number(data.billDiscount|| 0);   // bill-level discount
    const grandTotal   = Number(data.grandTotal  || 0);
    const amountPaid   = Number(data.amountPaid  ?? grandTotal);
    const balanceDue   = Number(data.balanceDue  || 0);
    const prevBalance  = Number(data.prevBalance || 0);
    const netAmount    = grandTotal + prevBalance;

    // ── Item rows ──────────────────────────────────────────────────────────
    const itemRows = items.map((it: any, i: number) => {
      const name      = esc(it.productName || '');
      const rate      = Number(it.price || 0);
      const qty       = Number(it.qty || 0);
      const unit      = esc(it.packagingUnit || 'unit');
      const pDisc     = Number(it.productDiscount || 0);
      const eDisc     = Number(it.extraDiscount || 0);
      const lineTotal = Number(it.lineTotal || 0);

      return `
        <tr>
          <td>${name}</td>
          <td>${fmt(rate)}</td>
          <td>${qty}</td>
          <td>${unit}</td>
          <td>${pDisc > 0 ? `${pDisc}` : '—'}</td>
          <td>${eDisc > 0 ? `${eDisc}` : '—'}</td>
          <td>${fmt(lineTotal)}</td>
        </tr>
      `;
    }).join('');

    const totalItems = items.length;

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Invoice – ${invoiceNo}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display:none !important; } body { margin:0; } }
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family:'Courier New', Courier, monospace; background:#fff; color:#000; font-size:11px; line-height:1.4; }
  .receipt { width:80mm; max-width:80mm; margin:0 auto; padding:10px 10px 16px; }
  .header { text-align:center; margin-bottom:6px; }
  .store-name { font-size:15px; font-weight:700; text-transform:uppercase; letter-spacing:1px; }
  .store-sub { font-size:10px; color:#333; margin-top:2px; }
  .meta-box { display:flex; justify-content:space-between; font-size:10px; margin:5px 0; }
  .meta-box .label { font-weight:700; }
  hr.solid  { border:none; border-top:2px solid #000; margin:5px 0; }
  hr.dashed { border:none; border-top:1px dashed #888; margin:4px 0; }

  table { width:100%; border-collapse:collapse; }
  table, th, td { border:1px solid #000; }
  th, td { text-align:center; padding:3px 2px; font-size:10.5px; }
  th { font-weight:700; text-transform:uppercase; }
  .td-name { text-align:left; }

  .totals-table, .totals-table td { border:1px solid #000; text-align:center; padding:3px 2px; font-size:10.5px; }
  .grand-row td, .net-row td { font-weight:700; font-size:12px; }
  .balance-due td { color:#c00; font-weight:700; }
  .prev-balance td { font-size:11px; }
  .footer { margin-top:10px; text-align:center; font-size:10px; color:#444; border-top:1px dashed #999; padding-top:6px; }
  .actions { display:flex; gap:10px; justify-content:center; flex-wrap:wrap; margin:18px auto 0; width:80mm; max-width:95vw; }
  .btn { padding:9px 22px; border:none; border-radius:6px; font-size:13px; font-weight:600; cursor:pointer; transition:opacity .15s; }
  .btn:hover { opacity:.85; }
  .btn-print  { background:#0d9488; color:#fff; }
  .btn-close  { background:#6b7280; color:#fff; }
  .summary-bar { display:flex; justify-content:space-between; background:#f0f0f0; border:1px solid #ccc; padding:4px 6px; font-size:10px; font-weight:700; margin-top:4px; }
</style>
</head>
<body>
<div class="receipt" id="receipt">
  <div class="header">
    <div class="store-name">${storeName}</div>
    ${storeAddress ? `<div class="store-sub">${storeAddress}</div>` : ''}
    ${storePhone   ? `<div class="store-sub">Tel: ${storePhone}</div>` : ''}
  </div>

  <hr class="solid">

  <div class="meta-box">
    <span>${customerName ? `<span class="label">Name:</span> ${customerName}` : '<span class="label">Walk-in Customer</span>'}</span>
    <span><span class="label">No:</span> ${invoiceNo}</span>
  </div>
  <div class="meta-box">
    <span>${customerPhone ? `<span class="label">Phone:</span> ${customerPhone}` : ''}</span>
    <span><span class="label">Date:</span> ${createdAt}</span>
  </div>

  <hr class="solid">

  <!-- Items Table -->
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Rate</th>
        <th>Pcs</th>
        <th>Unit</th>
        <th>Disc</th>
        <th>EDC</th>
        <th>Net</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="summary-bar">
    <span>Items ${totalItems}</span>
    <span>Payment: ${payMethod}</span>
  </div>

  <hr class="dashed">

  <!-- Totals Table -->
  <table class="totals-table">
    <tr><td>Sub Total</td><td>${fmt(subTotal)}</td></tr>
    ${gstTotal > 0 ? `<tr><td>GST</td><td>${fmt(gstTotal)}</td></tr>` : ''}
    ${discountAmt > 0 ? `<tr><td>Disc</td><td style="color:#c00">- ${fmt(discountAmt)}</td></tr>` : ''}
    ${extraDiscAmt > 0 ? `<tr><td>EDC</td><td style="color:#c00">- ${fmt(extraDiscAmt)}</td></tr>` : ''}
    ${billDiscAmt > 0 ? `<tr><td>BD</td><td style="color:#c00">- ${fmt(billDiscAmt)}</td></tr>` : ''}
    <tr class="grand-row"><td>TOTAL</td><td>${fmt(grandTotal)}</td></tr>
    ${amountPaid < grandTotal ? `<tr><td>Amount Paid</td><td>${fmt(amountPaid)}</td></tr>` : ''}
    ${prevBalance > 0 ? `<tr><td>Prev. Balance</td><td style="color:#c00">${fmt(prevBalance)}</td></tr>` : ''}
    ${(balanceDue > 0 || prevBalance > 0) ? `<tr class="net-row"><td>Net Amount</td><td>${fmt(netAmount)}</td></tr>` : ''}
    ${balanceDue > 0 ? `<tr><td>⚠ Balance Due</td><td>${fmt(balanceDue)}</td></tr>` : ''}
  </table>

  <div class="footer">${footer}</div>
</div>

<div class="actions no-print">
  <button class="btn btn-print" onclick="window.print()">🖨&nbsp; Print Receipt</button>
  <button class="btn btn-close" onclick="window.close()">✕&nbsp; Close</button>
</div>

<script>
  window.addEventListener('load', function () {
    if (window.opener) {
      setTimeout(function () { window.print(); }, 400);
    }
  });
</script>
</body>
</html>`;
  }
}

// ── Helpers ───────────────────────────────────────────────
function fmt(v: any): string { return Number(v || 0).toFixed(2); }

function esc(s: string): string {
  return String(s || '').replace(/[&<>"']/g, (c: string) =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string)
  );
}

function formatDate(iso: any): string {
  try {
    const d = new Date(iso || Date.now());
    const dd   = String(d.getDate()).padStart(2,'0');
    const mon  = d.toLocaleString('en',{month:'short'});
    const yyyy = d.getFullYear();
    const hh   = String(d.getHours()).padStart(2,'0');
    const mm   = String(d.getMinutes()).padStart(2,'0');
    return `${dd}-${mon}-${yyyy} ${hh}:${mm}`;
  } catch { return String(iso || ''); }
}