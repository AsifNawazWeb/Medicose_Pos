const { z } = require('zod');
const Customer = require('../models/customer.model');
const Sales    = require('../models/sales.model');

const schema = z.object({
  name:          z.string().min(2),
  phone:         z.string().optional().nullable(),
  email:         z.string().email().optional().nullable(),
  address:       z.string().optional().nullable(),
  notes:         z.string().optional().nullable(),
  loyaltyPoints: z.number().int().nonnegative().optional().default(0),
});

function list(req, res) {
  try {
    const q      = String(req.query.q     || '');
    const limit  = Number(req.query.limit  || 50);
    const offset = Number(req.query.offset || 0);
    res.json({ ok: true, data: Customer.list({ q, limit, offset }) });
  } catch (err) { res.status(500).json({ ok: false, message: err.message }); }
}

function get(req, res) {
  try {
    const customer = Customer.getById(Number(req.params.id));
    if (!customer) return res.status(404).json({ ok: false, message: 'Not found' });
    res.json({ ok: true, data: customer });
  } catch (err) { res.status(500).json({ ok: false, message: err.message }); }
}

function create(req, res) {
  try {
    const data = schema.parse(req.body);
    res.status(201).json({ ok: true, data: Customer.create(data) });
  } catch (err) { res.status(err.name === 'ZodError' ? 422 : 400).json({ ok: false, message: err.message }); }
}

function update(req, res) {
  try {
    const data = schema.parse(req.body);
    res.json({ ok: true, data: Customer.update(Number(req.params.id), data) });
  } catch (err) { res.status(err.name === 'ZodError' ? 422 : 400).json({ ok: false, message: err.message }); }
}

function remove(req, res) {
  try {
    Customer.remove(Number(req.params.id));
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ ok: false, message: err.message }); }
}

function getLedger(req, res) {
  try {
    const ledger = Sales.getCustomerLedger(Number(req.params.id));
    const cust   = Customer.getById(Number(req.params.id));
    res.json({ ok: true, data: { customer: cust, ledger } });
  } catch (err) { res.status(500).json({ ok: false, message: err.message }); }
}

module.exports = { list, get, create, update, remove, getLedger };
