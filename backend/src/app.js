const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const pinoHttp = require('pino-http');
const { z } = require('zod');

const { config } = require('./config/env');
const { logger } = require('./utils/logger');
const { errorMiddleware } = require('./middlewares/error.middleware');

const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const productRoutes = require('./routes/products.routes');
const salesRoutes = require('./routes/sales.routes');
const supplierRoutes = require('./routes/suppliers.routes');
const customerRoutes = require('./routes/customers.routes');
const reportsRoutes = require('./routes/reports.routes');
const settingsRoutes = require('./routes/settings.routes');
const returnsRoutes = require('./routes/returns.routes');
const poRoutes = require('./routes/purchase-orders.routes');
const whatsappRoutes = require('./routes/whatsapp.routes');

function createApp() {
  const app = express();

  app.disable('x-powered-by');

  app.use(helmet({
    contentSecurityPolicy: false, // Electron renderer uses file:// in prod; CSP handled in frontend
  }));

  app.use(cors({ origin: true, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '2mb' }));

  app.use(pinoHttp({ logger }));

  app.get('/health', (_req, res) => res.json({ ok: true, status: 'UP' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/suppliers', supplierRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/sales', salesRoutes);
  app.use('/api/returns', returnsRoutes);
  app.use('/api/purchase-orders', poRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/whatsapp', whatsappRoutes);

  // 404
  app.use((_req, res) => res.status(404).json({ ok: false, error: { message: 'Not Found' } }));

  // zod validation errors
  app.use((err, req, res, next) => {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: { message: 'Validation error', details: err.flatten() } });
    }
    next(err);
  });

  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
