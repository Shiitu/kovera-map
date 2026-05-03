/**
 * @file backend/src/config/index.ts
 * @description Loads environment variables and exports a configuration object.
 */

import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || 'your_jwt_secret_here',
  koveraApiKey: process.env.KOVERA_API_KEY,
  koveraApiBase: process.env.KOVERA_API_BASE || 'https://api.kovera.io',
  googleGeocodingApiKey: process.env.GOOGLE_GEOCODING_API_KEY,
  geocodeCacheTtlDays: parseInt(process.env.GEOCODE_CACHE_TTL_DAYS || '7', 10),
  adminEmail: process.env.ADMIN_EMAIL || 'admin@kovera.io',
  adminPasswordHash: process.env.ADMIN_PASSWORD_HASH,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDemoMode: !process.env.DATABASE_URL
};

export default config;
