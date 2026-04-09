const { z } = require('zod');
const Product = require('../models/product.model');

const productSchema = z.object({
  name: z.string().min(2),
  sku: z.string().optional().nullable(),
  barcode: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  batchNo: z.string().optional().nullable(),
  unit: z.string().default('pcs'),
  price: z.number().nonnegative(),
  cost: z.number().nonnegative().default(0),
  gstRate: z.number().min(0).max(100).default(0),
  stockQty: z.number().int().nonnegative().default(0),
  reorderLevel: z.number().int().nonnegative().default(0),
  expiryDate: z.string().optional().nullable(), // ISO date (YYYY-MM-DD)
  supplierId: z.number().int().optional().nullable(),
  isActive: z.boolean().default(true),
  shelf: z.string().optional().nullable(),
  productDiscount: z.number().min(0).max(100).default(0),
  unitsPerStrip:   z.number().int().min(1).default(1),
  stripsPerBox:    z.number().int().min(1).default(1),
  packagingUnit:   z.enum(['unit','strip','box']).default('unit'),
});

const stockSchema = z.object({
  stockQty: z.number().int().nonnegative(),
});

function list(req, res) {
  const q = String(req.query.q || '');
  const category = String(req.query.category || '');
  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);
  res.json({ ok: true, data: Product.list({ q, category, limit, offset }) });
}

function get(req, res) {
  const id = Number(req.params.id);
  const row = Product.getById(id);
  res.json({ ok: true, data: row || null });
}

function scan(req, res) {
  const barcode = String(req.params.barcode || '');
  const row = Product.getByBarcode(barcode);
  res.json({ ok: true, data: row || null });
}

function create(req, res) {
  const data = productSchema.parse(req.body);
  const row = Product.create({
    ...data,
    sku: data.sku ? `MED-${data.sku}` : null,
    barcode: data.barcode || null,
    category: data.category || null,
    batchNo: data.batchNo? `B-${data.batchNo}` : null,
    expiryDate: data.expiryDate || null,
    supplierId: data.supplierId ?? null,
    isActive: data.isActive ? 1 : 0,
    shelf: data.shelf || null,
    productDiscount: data.productDiscount || 0,
    unitsPerStrip:   data.unitsPerStrip   || 1,
    stripsPerBox:    data.stripsPerBox    || 1,
    packagingUnit:   data.packagingUnit   || 'unit',
    productDiscount: data.productDiscount || 0,
    unitsPerStrip:   data.unitsPerStrip   || 1,
    stripsPerBox:    data.stripsPerBox    || 1,
    packagingUnit:   data.packagingUnit   || 'unit',
  });
  res.status(201).json({ ok: true, data: row });
}

function update(req, res) {
  const id = Number(req.params.id);
  const data = productSchema.parse(req.body);
  const row = Product.update(id, {
    ...data,
    sku: data.sku || null,
    barcode: data.barcode || null,
    category: data.category || null,
    batchNo: data.batchNo || null,
    expiryDate: data.expiryDate || null,
    supplierId: data.supplierId ?? null,
    isActive: data.isActive ? 1 : 0,
    shelf: data.shelf || null,
    productDiscount: data.productDiscount || 0,
    unitsPerStrip:   data.unitsPerStrip   || 1,
    stripsPerBox:    data.stripsPerBox    || 1,
    packagingUnit:   data.packagingUnit   || 'unit',
    productDiscount: data.productDiscount || 0,
    unitsPerStrip:   data.unitsPerStrip   || 1,
    stripsPerBox:    data.stripsPerBox    || 1,
    packagingUnit:   data.packagingUnit   || 'unit',
  });
  res.json({ ok: true, data: row });
}

function updateStock(req, res) {
  const id = Number(req.params.id);
  const data = stockSchema.parse(req.body);
  const row = Product.updateStock(id, data.stockQty);
  res.json({ ok: true, data: row });
}

function remove(req, res) {
  const id = Number(req.params.id);
  Product.remove(id);
  res.json({ ok: true });
}

module.exports = { list, get, scan, create, update, updateStock, remove };
