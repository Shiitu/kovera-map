/**
 * @file backend/src/db/pool.ts
 * @description Configures and exports the PostgreSQL connection pool.
 */

import pg from 'pg';
import dotenv from 'dotenv';

// Ensure environment variables are loaded
dotenv.config();

const { Pool } = pg;

// Use DATABASE_URL for connection if available, or fall back to individual parameters
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  // Add some sensible defaults for production-ready pooling
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  // If running in development, you might want to allow self-signed certs for some DB providers
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;
