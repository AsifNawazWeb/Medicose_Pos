import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ReceiptService {

  buildHtml(data: any): string {
    const storeName    = esc(data.storeName    || 'Yashfeen Medicose Pabbi');
    const storeAddress = esc(data.storeAddress || 'Pabbi Bazar');
    const storePhone   = esc(data.storePhone   || '0333-1234567');
    const footer       = esc('Developed by: AsifTech (03139329499)');
    const invoiceNo    = esc(data.invoiceNo    || 'N/A');
    const createdAt    = formatDate(data.createdAt);
    const customerName = esc(data.customerName || '');
    const customerPhone= esc(data.customerPhone|| '');
    const payMethod    = esc(data.paymentMethod|| 'CASH');

    const items        = data.items || [];
    const subTotal     = Number(data.subTotal    || 0);
    const gstTotal     = Number(data.gstTotal    || 0);
    const discountAmt  = Number(data.discount    || 0);
    const extraDiscAmt = Number(data.extraDiscount|| 0);
    const billDiscAmt  = Number(data.billDiscount|| 0);
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
      const lineTotal = Number(it.lineTotal || 0);

      return `
        <tr>
          <td class="td-name">${name}</td>
          <td>${fmtWhole(rate)}</td>
          <td>${qty}</td>
          <td>${fmtWhole(lineTotal)}</td>
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
  /* 64mm width ensures content fits strictly within the ~72mm physical thermal print head */
  @page { size: 64mm auto; margin: 0; }
  @media print {
    * { 
      -webkit-print-color-adjust: exact !important; 
      print-color-adjust: exact !important; 
      color: #000000 !important; /* Force true black for all elements */
    }
    html, body { width: 64mm; margin: 0; padding: 0; }
    .no-print { display: none !important; }
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  
  /* Switched to clear sans-serif with bold weight for crisp, dark thermal heating */
  body { 
    font-family: Arial, Helvetica, sans-serif; 
    background: #fff; 
    color: #000000; 
    font-size: 10px; 
    font-weight: 700; /* Bold overall text so print pins heat dark */
    line-height: 1.2; 
  }

  .receipt { width: 64mm; max-width: 64mm; margin: 0 auto; padding: 2px 0 10px; }
  .header { text-align: center; margin-bottom: 3px; }
  .store-name { font-size: 13px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.3px; }
  .store-sub { font-size: 9.5px; font-weight: 700; color: #000000; margin-top: 1px; }
  
  .meta-box { display: flex; justify-content: space-between; font-size: 9.5px; margin: 2px 0; font-weight: 700; }
  .meta-box .label { font-weight: 900; }
  
  hr.solid  { border: none; border-top: 2px solid #000000; margin: 3px 0; }
  hr.dashed { border: none; border-top: 1px dashed #000000; margin: 3px 0; }

  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table, th, td { border: 1px solid #000000; }
  
  th, td { 
    text-align: center; 
    padding: 2px 1px; 
    font-size: 9.5px; 
    font-weight: 700; 
    color: #000000; 
    word-break: break-word; 
  }
  th { font-weight: 900; text-transform: uppercase; background-color: #f0f0f0; }
  .td-name { text-align: left; }

  /* Column widths: Name 42%, Rate 22%, Qty 16%, Net 20% */
  table.items-table col:nth-child(1) { width: 42%; }
  table.items-table col:nth-child(2) { width: 22%; }
  table.items-table col:nth-child(3) { width: 16%; }
  table.items-table col:nth-child(4) { width: 20%; }

  .totals-table, .totals-table td { border: 1px solid #000000; text-align: center; padding: 2px 1px; font-size: 10px; font-weight: 700; }
  .grand-row td, .net-row td { font-weight: 900; font-size: 11.5px; }
  .balance-due td { color: #000000; font-weight: 900; }
  .prev-balance td { font-size: 10px; }
  
  .footer { margin-top: 6px; text-align: center; font-size: 9.5px; font-weight: 700; color: #000000; border-top: 1px dashed #000000; padding-top: 4px; }
  .actions { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin: 12px auto 0; width: 64mm; max-width: 95vw; }
  .btn { padding: 7px 16px; border: none; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; transition: opacity .15s; }
  .btn:hover { opacity: .85; }
  .btn-print  { background: #0d9488; color: #fff; }
  .btn-close  { background: #6b7280; color: #fff; }
  .summary-bar { display: flex; justify-content: space-between; background: #f0f0f0; border: 1px solid #000000; padding: 3px 4px; font-size: 9.5px; font-weight: 900; margin-top: 2px; }
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
  <table class="items-table">
    <colgroup>
      <col style="width: 42%;">
      <col style="width: 22%;">
      <col style="width: 16%;">
      <col style="width: 20%;">
    </colgroup>
    <thead>
      <tr>
        <th>Name</th>
        <th>Rate</th>
        <th>Qty</th>
        <th>Net</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <div class="summary-bar">
    <span>Items: ${totalItems}</span>
    <span>Payment: ${payMethod}</span>
  </div>

  <hr class="dashed">

  <!-- Totals Table -->
  <table class="totals-table">
    <tr><td>Sub Total</td><td>${fmt(subTotal)}</td></tr>
    ${gstTotal > 0 ? `<tr><td>GST</td><td>${fmt(gstTotal)}</td></tr>` : ''}
    ${discountAmt > 0 ? `<tr><td>Disc</td><td>- ${fmt(discountAmt)}</td></tr>` : ''}
    ${extraDiscAmt > 0 ? `<tr><td>EDC</td><td>- ${fmt(extraDiscAmt)}</td></tr>` : ''}
    ${billDiscAmt > 0 ? `<tr><td>Discount</td><td>- ${fmt(billDiscAmt)}</td></tr>` : ''}
    <tr class="grand-row"><td>TOTAL</td><td>${fmt(grandTotal)}</td></tr>
    ${amountPaid < grandTotal ? `<tr><td>Amount Paid</td><td>${fmt(amountPaid)}</td></tr>` : ''}
    ${prevBalance > 0 ? `<tr><td>Prev. Balance</td><td>${fmt(prevBalance)}</td></tr>` : ''}
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

function fmtWhole(v: any): string { return Math.round(Number(v || 0)).toString(); }

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