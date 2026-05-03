/**
 * @file server.ts
 * @description Main entry point for the Kovera Network Map Portal backend.
 * Integrates Express API routes and Vite middleware for the frontend.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import config from './backend/src/config/index.js';
import { errorHandler } from './backend/src/middleware/errorHandler.js';
import authRoutes from './backend/src/routes/auth.js';
import networkRoutes from './backend/src/routes/network.js';
import adminRoutes from './backend/src/routes/admin.js';
import analyticsRoutes from './backend/src/routes/analytics.js';
import { migrate } from './backend/src/db/migrate.js';
import logger from './backend/src/utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Basic Middleware
  app.use(cors());
  app.use(express.json());

  // Database Migration (optional auto-migration)
  if (!config.isDemoMode) {
    try {
      await migrate();
    } catch (err) {
      logger.warn('Initial migration check failed. Ensure DATABASE_URL is valid.');
    }
  } else {
    logger.info('Running in DEMO MODE (no database connected)');
  }

  // API Routes
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/network', networkRoutes);
  app.use('/api/admin', adminRoutes);

  // Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
  });

  // Vite middleware for development or static serving for production
  if (config.nodeEnv !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  const port = typeof config.port === 'string' ? parseInt(config.port, 10) : Number(config.port);

  app.listen(port, '0.0.0.0', () => {
    logger.info(`Kovera Network Map Portal running at http://localhost:${port}`);
  });
}

startServer();
