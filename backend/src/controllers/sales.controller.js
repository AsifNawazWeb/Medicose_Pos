const { z } = require('zod');
const Sales = require('../models/sales.model');

// ── Per-item schema ───────────────────────────────────────────────────────────
const itemSchema = z.object({
  productId:       z.number().int(),
  qty:             z.number().int().min(0),
  price:           z.number().nonnegative().optional(),
  gstRate:         z.number().min(0).max(100).optional(),
  productDiscount: z.number().min(0).max(100).optional().default(0),
  extraDiscount:   z.number().min(0).max(100).optional().default(0),  // new: extra per-item discount
  packagingUnit:   z.enum(['unit','strip','box']).optional().default('unit'),
});

// ── Sale creation schema ──────────────────────────────────────────────────────
const createSchema = z.object({
  customerId:     z.number().int().optional().nullable(),
  isNewCustomer:  z.boolean().optional().default(false),
  customerName:   z.string().optional().nullable(),
  customerPhone:  z.string().optional().nullable(),
  paymentMethod:  z.enum(['CASH','CARD','UPI','MIXED']).default('CASH'),
  discount:       z.number().min(0).default(0),          // legacy flat discount
  billDiscount:   z.number().min(0).max(100).default(0), // % bill-level discount
  amountPaid:     z.number().nonnegative().optional().nullable(),
  items:          z.array(itemSchema).min(1),
});

// ── Sale edit schema ──────────────────────────────────────────────────────────
const editSchema = z.object({
  items:        z.array(itemSchema).min(1),
  billDiscount: z.number().min(0).max(100).default(0),
  amountPaid:   z.number().nonnegative().optional().nullable(),
});

// ── Customer payment schema ───────────────────────────────────────────────────
const paymentSchema = z.object({
  amount: z.number().positive(),
  note:   z.string().optional().default(''),
});

function list(req, res) {
  try {
    const from   = req.query.from ? String(req.query.from) : null;
    const to     = req.query.to   ? String(req.query.to)   : null;
    const q      = req.query.q    ? String(req.query.q)    : '';
    const limit  = Number(req.query.limit  || 50);
    const offset = Number(req.query.offset || 0);
    res.json({ ok: true, data: Sales.list({ from, to, q, limit, offset }) });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

function get(req, res) {
  try {
    const data = Sales.getById(Number(req.params.id));
    if (!data) return res.status(404).json({ ok: false, message: 'Not found' });
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

function create(req, res) {
  try {
    const body = createSchema.parse(req.body);
    const data = Sales.create({ userId: req.user.id, ...body });
    res.status(201).json({ ok: true, data });
  } catch (err) {
    res.status(err.name === 'ZodError' ? 422 : 400).json({ ok: false, message: err.message });
  }
}

function edit(req, res) {
  try {
    const id   = Number(req.params.id);
    const body = editSchema.parse(req.body);
    const data = Sales.edit(id, { ...body, userId: req.user.id });
    res.json({ ok: true, data });
  } catch (err) {
    res.status(err.name === 'ZodError' ? 422 : 400).json({ ok: false, message: err.message });
  }
}

function getLedger(req, res) {
  try {
    const data = Sales.getCustomerLedger(Number(req.params.customerId));
    res.json({ ok: true, data });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

function recordPayment(req, res) {
  try {
    const body = paymentSchema.parse(req.body);
    const data = Sales.recordPayment({ customerId: Number(req.params.customerId), ...body });
    res.json({ ok: true, data });
  } catch (err) {
    res.status(400).json({ ok: false, message: err.message });
  }
}

module.exports = { list, get, create, edit, getLedger, recordPayment };