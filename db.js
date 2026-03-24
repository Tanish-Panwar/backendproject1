const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER,           // 'postgres'
  host: process.env.DB_HOST,           // 'db.lgugpaggpuwyymvakwiz.supabase.co'
  database: process.env.DB_NAME,       // 'postgres'
  password: process.env.DB_PASSWORD,   // raw password, no encoding needed
  port: process.env.DB_PORT || 5432,
  ssl: { rejectUnauthorized: true },   // for Supabase
});

module.exports = pool;