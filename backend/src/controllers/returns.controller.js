const { z } = require('zod');
const Returns = require('../models/returns.model');

const itemSchema = z.object({
  productId: z.number().int(),
  qty: z.number().int().positive(),
});

const createSchema = z.object({
  saleId: z.number().int(),
  reason: z.string().optional().default(''),
  items: z.array(itemSchema).min(1),
});

function list(req, res) {
  const limit = Number(req.query.limit || 50);
  const offset = Number(req.query.offset || 0);
  res.json({ ok: true, data: Returns.list({ limit, offset }) });
}

function create(req, res) {
  const body = createSchema.parse(req.body);
  const data = Returns.create({ userId: req.user.id, ...body });
  res.status(201).json({ ok: true, data });
}

module.exports = { list, create };
