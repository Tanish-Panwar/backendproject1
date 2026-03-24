const { Pool } = require('pg');
const dns = require('dns');

// Force IPv4 first to avoid ENETUNREACH on Render
dns.setDefaultResultOrder('ipv4first');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true }, // required for Supabase
});

module.exports = pool;