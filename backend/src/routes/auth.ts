/**
 * @file backend/src/routes/auth.ts
 * @description Authentication routes for login and token provisioning.
 */

import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from '../db/pool.js';
import config from '../config/index.js';
import { verifyToken, requireAdmin, AuthRequest } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  try {
    // Demo mode: validate against configured admin credentials
    if (config.isDemoMode) {
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
    }

    // 1. Check if it's the admin
    if (email === config.adminEmail) {
      const isMatch = config.adminPasswordHash ? await bcrypt.compare(password, config.adminPasswordHash) : true;
      
      if (isMatch) {
        const token = jwt.sign(
          { userId: 0, role: 'admin' },
          config.jwtSecret,
          { expiresIn: '24h' }
        );
        return res.json({ token, role: 'admin' });
      }
    }

    // 2. Check regular users (Simulation: just checking if email exists in users table)
    const userRes = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userRes.rows.length > 0) {
      // In a real app, we'd check a password hash here too. 
      // For this demo, we'll allow login for any existing user with any password.
      const user = userRes.rows[0];
      const token = jwt.sign(
        { userId: user.id, role: 'user' },
        config.jwtSecret,
        { expiresIn: '24h' }
      );
      return res.json({ token, role: 'user' });
    }

    return res.status(401).json({ error: 'Invalid credentials', code: 'AUTH_FAILED' });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/provision
 * Auth: admin only
 * Body: { label, role, user_id?, expires_in_days? }
 */
router.post('/provision', verifyToken, requireAdmin, async (req: AuthRequest, res, next) => {
  const { label, role, user_id, expires_in_days = 7 } = req.body;

  try {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expires_in_days);

    // Generate a unique token string (using JWT but could be random uuid)
    const tokenStr = jwt.sign(
      { userId: user_id || 0, role, isInvite: true },
      config.jwtSecret,
      { expiresIn: `${expires_in_days}d` }
    );

    const result = await pool.query(
      `INSERT INTO network_access_tokens (token, role, user_id, label, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING token`,
      [tokenStr, role, user_id || null, label, expiresAt]
    );

    res.json({ token: result.rows[0].token });
  } catch (err) {
    next(err);
  }
});

export default router;
