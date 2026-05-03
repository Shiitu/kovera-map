/**
 * @file backend/src/routes/analytics.ts
 * @description Proxy routes for Kovera Analytics API.
 * Forwards all /api/analytics/* requests to the production Kovera API at https://app.kovera.io
 */

import express from 'express';
import axios from 'axios';
import config from '../config/index.js';
import logger from '../utils/logger.js';

const router = express.Router();

const KOVERA_API_BASE = 'https://app.kovera.io';

/**
 * Catch-all proxy handler.
 * Forwards GET/POST/PUT requests from /api/analytics/* to KOVERA_API_BASE/api/analytics/*
 */
router.all('/*', async (req, res) => {
  // Build the target URL: /api/analytics/<whatever the sub-path is>
  const targetPath = req.originalUrl; // e.g. /api/analytics/dashboard?from=...
  const targetUrl = `${KOVERA_API_BASE}${targetPath}`;

  try {
    logger.info(`[Analytics Proxy] ${req.method} ${targetUrl}`);

    const axiosConfig: any = {
      method: req.method,
      url: targetUrl,
      headers: {
        'Content-Type': 'application/json',
        // Forward the Authorization header if present
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      // Forward query params
      params: req.query,
      // Forward body for POST/PUT
      ...(req.body && Object.keys(req.body).length > 0 ? { data: req.body } : {}),
      // Don't throw on non-2xx
      validateStatus: () => true,
      timeout: 30000,
    };

    // Remove params from axiosConfig since they're already in the URL via req.originalUrl
    delete axiosConfig.params;

    const response = await axios(axiosConfig);

    // Forward the status code and response
    res.status(response.status);

    // Forward content-type header
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }
    if (response.headers['content-disposition']) {
      res.setHeader('Content-Disposition', response.headers['content-disposition']);
    }

    res.send(response.data);
  } catch (err: any) {
    logger.error(`[Analytics Proxy] Error proxying to ${targetUrl}: ${err.message}`);
    res.status(502).json({
      error: 'Failed to fetch from Kovera Analytics API',
      detail: err.message,
    });
  }
});

export default router;
