/**
 * @file api/index.ts
 * @description Vercel Serverless Function entry point.
 * Wraps the Express backend as a serverless handler for Vercel.
 */

import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

// ── Config ──
const config = {
  jwtSecret: process.env.JWT_SECRET || 'dev_jwt_secret_key',
  adminEmail: process.env.ADMIN_EMAIL || 'Om@kovera.io',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
};

const KOVERA_API_BASE = 'https://app.kovera.io';

// ── Auth Routes ──
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (email === config.adminEmail && config.adminPasswordHash) {
      const isMatch = await bcrypt.compare(password, config.adminPasswordHash);
      if (isMatch) {
        const token = jwt.sign(
          { userId: 0, role: 'admin' },
          config.jwtSecret,
          { expiresIn: '24h' }
        );
        return res.json({ token, role: 'admin' });
      }
    }
    return res.status(401).json({ error: 'Invalid credentials', code: 'AUTH_FAILED' });
  } catch (err: any) {
    res.status(500).json({ error: 'Login failed', detail: err.message });
  }
});

// ── Admin Routes (demo mode) ──
app.get('/api/admin/internal-users', (_req, res) => {
  res.json([
    { user_id: 101, email: 'bot_alpha@kovera.io', added_by: 'system', added_at: new Date() },
    { user_id: 102, email: 'bot_beta@kovera.io', added_by: 'system', added_at: new Date() }
  ]);
});

app.get('/api/admin/tokens', (_req, res) => {
  res.json([
    { id: 1001, token: 'demo_token_1', role: 'admin', label: 'Admin Key', created_at: new Date() },
    { id: 1002, token: 'demo_token_2', role: 'user', label: 'External Partner', created_at: new Date() }
  ]);
});

// ── Analytics Proxy (catch-all for /api/analytics/*) ──
app.all('/api/analytics/*', async (req, res) => {
  const targetUrl = `${KOVERA_API_BASE}${req.originalUrl}`;

  try {
    const axiosConfig: any = {
      method: req.method,
      url: targetUrl,
      headers: {
        'Content-Type': 'application/json',
        ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
      },
      ...(req.body && Object.keys(req.body).length > 0 ? { data: req.body } : {}),
      validateStatus: () => true,
      timeout: 25000,
    };

    const response = await axios(axiosConfig);

    res.status(response.status);
    if (response.headers['content-type']) {
      res.setHeader('Content-Type', response.headers['content-type']);
    }
    if (response.headers['content-disposition']) {
      res.setHeader('Content-Disposition', response.headers['content-disposition']);
    }
    res.send(response.data);
  } catch (err: any) {
    res.status(502).json({
      error: 'Failed to fetch from Kovera Analytics API',
      detail: err.message,
    });
  }
});

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date(), env: 'vercel' });
});

export default app;
