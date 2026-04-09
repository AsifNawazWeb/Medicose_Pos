const { z } = require('zod');
const Settings = require('../models/settings.model');

const schema = z.object({
  storeName: z.string().min(2).default('Medical POS'),
  storePhone: z.string().optional().nullable(),
  storeAddress: z.string().optional().nullable(),
  receiptFooter: z.string().optional().nullable(),
  brandColor: z.string().default('#4f46e5'),
  logoDataUrl: z.string().optional().nullable(),
  gstEnabled: z.boolean().default(true),
});

function get(req, res) {
  res.json({ ok: true, data: Settings.get() });
}

function update(req, res) {
  const data = schema.parse(req.body);
  res.json({ ok: true, data: Settings.upsert(data) });
}

module.exports = { get, update };
