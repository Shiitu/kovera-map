/**
 * @file backend/src/db/migrate.ts
 * @description Creates the initial database schema for the Kovera Network Map Portal.
 */

import pool from './pool.js';

export async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Starting database migration...');

    // 1. Existing Kovera Tables (Simulating their existence if not there)
    // users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // user_profiles
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        current_address TEXT,
        geocode_lat NUMERIC(10,7),
        geocode_lng NUMERIC(10,7)
      );
    `);

    // listings
    await client.query(`
      CREATE TABLE IF NOT EXISTS listings (
        id SERIAL PRIMARY KEY,
        address TEXT NOT NULL,
        is_seeded BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // likes
    await client.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        listing_id INTEGER REFERENCES listings(id),
        liked_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // dream_homes
    await client.query(`
      CREATE TABLE IF NOT EXISTS dream_homes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        address TEXT NOT NULL,
        source TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // 2. New Tables for Network Portal
    
    // network_geocode_cache
    await client.query(`
      CREATE TABLE IF NOT EXISTS network_geocode_cache (
        id SERIAL PRIMARY KEY,
        address TEXT UNIQUE NOT NULL,
        lat NUMERIC(10,7),
        lng NUMERIC(10,7),
        cached_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // network_internal_users
    await client.query(`
      CREATE TABLE IF NOT EXISTS network_internal_users (
        user_id INTEGER REFERENCES users(id) PRIMARY KEY,
        added_by TEXT,
        added_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // network_access_tokens
    await client.query(`
      CREATE TABLE IF NOT EXISTS network_access_tokens (
        id SERIAL PRIMARY KEY,
        token TEXT UNIQUE NOT NULL,
        role TEXT NOT NULL, -- 'admin' | 'user'
        user_id INTEGER REFERENCES users(id),
        label TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ
      );
    `);

    console.log('Database migration completed successfully.');
  } catch (err) {
    console.error('Error during migration:', err);
    throw err;
  } finally {
    client.release();
  }
}

// Run if called directly
if (process.argv[1].endsWith('migrate.ts') || process.argv[1].endsWith('migrate.js')) {
  migrate().then(() => process.exit(0)).catch(() => process.exit(1));
}
