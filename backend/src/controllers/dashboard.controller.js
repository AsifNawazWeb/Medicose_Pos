const Reports = require('../models/reports.model');

function stats(req, res) {
  const from = req.query.from ? String(req.query.from) : null;
  const to = req.query.to ? String(req.query.to) : null;
  res.json({ ok: true, data: Reports.summary({ from, to, defaultMode: 'today' }) });
}

function topProducts(req, res) {
  let from = req.query.from ? String(req.query.from) : null;
  let to = req.query.to ? String(req.query.to) : null;
  const limit = Number(req.query.limit || 10);
  if (!from || !to) {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    from = thirtyDaysAgo.toISOString();
    to = endOfDay.toISOString();
  }
  res.json({ ok: true, data: Reports.topProducts({ from, to, limit }) });
}

module.exports = { stats, topProducts };
