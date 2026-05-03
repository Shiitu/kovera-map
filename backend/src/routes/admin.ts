/**
 * @file backend/src/routes/admin.ts
 * @description Admin routes for managing internal users and access tokens.
 */

import express from 'express';
import pool from '../db/pool.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

import config from '../config/index.js';

const router = express.Router();

// Apply admin middleware to all routes here
router.use(verifyToken, requireAdmin);

/**
 * GET /api/admin/internal-users
 */
router.get('/internal-users', async (req, res, next) => {
  if (config.isDemoMode) {
    return res.json([
      { user_id: 101, email: 'bot_alpha@kovera.io', added_by: 'system', added_at: new Date() },
      { user_id: 102, email: 'bot_beta@kovera.io', added_by: 'system', added_at: new Date() }
    ]);
  }
  try {
    const result = await pool.query(`
      SELECT n.user_id, u.email, n.added_by, n.added_at 
      FROM network_internal_users n
      JOIN users u ON n.user_id = u.id
    `);
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/admin/internal-users
 * Body: { user_id }
 */
router.post('/internal-users', async (req, res, next) => {
  const { user_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO network_internal_users (user_id, added_by) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [user_id, 'admin'] // In a real app, use the logged in admin's email
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/admin/internal-users/:user_id
 */
router.delete('/internal-users/:user_id', async (req, res, next) => {
  const { user_id } = req.params;
  try {
    await pool.query('DELETE FROM network_internal_users WHERE user_id = $1', [user_id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/admin/tokens
 */
router.get('/tokens', async (req, res, next) => {
  if (config.isDemoMode) {
    return res.json([
      { id: 1001, token: 'demo_token_1', role: 'admin', label: 'Admin Key', created_at: new Date() },
      { id: 1002, token: 'demo_token_2', role: 'user', label: 'External Partner', created_at: new Date() }
    ]);
  }
  try {
    const result = await pool.query('SELECT * FROM network_access_tokens ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (err) {
    next(err);
  }
});

export default router;
