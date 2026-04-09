/**
 * whatsapp.service.js
 * Builds WhatsApp-ready invoice messages. Now includes discount breakdown
 * so the customer can see their savings clearly.
 */

/**
 * Builds the text body for a WhatsApp invoice notification.
 *
 * @param {object} opts
 * @param {string} opts.invoiceNo
 * @param {number} opts.amount        - grandTotal
 * @param {string} opts.storeName
 * @param {number} [opts.discountAmt] - combined item-level discount amount (optional)
 * @param {number} [opts.billDiscAmt] - bill-level extra discount amount (optional)
 * @param {number} [opts.balanceDue]  - outstanding balance due (optional)
 */
function buildInvoiceMessage({ invoiceNo, amount, storeName, discountAmt = 0, billDiscAmt = 0, balanceDue = 0 }) {
  const totalSavings = Number(discountAmt || 0) + Number(billDiscAmt || 0);

  let msg = `*${storeName}*\n`;
  msg += `Invoice No: *${invoiceNo}*\n`;
  msg += `Amount: *Rs. ${Number(amount).toFixed(2)}*`;

  // Show savings only if any discount was applied
  if (totalSavings > 0) {
    msg += `\nYou saved: *Rs. ${totalSavings.toFixed(2)}*`;
  }

  // Warn about outstanding balance
  if (Number(balanceDue) > 0) {
    msg += `\n⚠ Balance Due: *Rs. ${Number(balanceDue).toFixed(2)}*`;
  }

  msg += `\n\nThank you for your purchase! 🙏`;
  return msg;
}

/**
 * Builds a wa.me deep-link for direct WhatsApp chat.
 *
 * @param {string} phone   - digits only, with country code (e.g. 923001234567)
 * @param {string} message - plain text message
 * @returns {string} wa.me URL
 */
function buildWhatsAppLink(phone, message) {
  // Strip all non-digit characters; caller should supply country code
  const normalized = String(phone || '').replace(/[^\d]/g, '');
  const txt = encodeURIComponent(message || '');
  return `https://wa.me/${normalized}?text=${txt}`;
}

module.exports = { buildInvoiceMessage, buildWhatsAppLink };