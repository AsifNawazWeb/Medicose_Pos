const { z } = require('zod');
const PO = require('../models/purchase-orders.model');

const itemSchema = z.object({
  productId: z.number().int(),
  qty: z.number().int().positive(),
  cost: z.number().nonnegative().optional(),
});

const createSchema = z.object({
  supplierId: z.number().int().optional().nullable(),
  items: z.array(itemSchema).min(1),
});

function list(req, res) {
  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);
  res.json({ ok: true, data: PO.list({ limit, offset }) });
}

function get(req, res) {
  res.json({ ok: true, data: PO.getById(Number(req.params.id)) });
}

function create(req, res) {
  const body = createSchema.parse(req.body);
  res.status(201).json({ ok: true, data: PO.create({ userId: req.user.id, ...body }) });
}

function receive(req, res) {
  res.json({ ok: true, data: PO.receive(Number(req.params.id)) });
}

module.exports = { list, get, create, receive };
