const Reports = require('../models/reports.model');

function stats(req, res) {
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  res.json({ ok: true, data: Reports.summary({ from, to }) });
}

function topProducts(req, res) {
  res.json({ ok: true, data: Reports.topProducts({ limit: Number(req.query.limit || 10) }) });
}

module.exports = { stats, topProducts };
