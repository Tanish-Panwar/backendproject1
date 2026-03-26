const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  family: 4,
});

// LOGGING aquisition, and release.
pool.on('acquire', () => console.log('📥 Connection acquired'));
pool.on('remove', () => console.log('🔴 Connection removed'));

// Wrapped query
const query = async (text, params) => {
  const client = await pool.connect();
  console.log('📥 Acquired connection');

  try {
    const res = await client.query(text, params);
    return res;
  } finally {
    client.release();
    console.log('📤 Released connection');
  }
};

module.exports = { pool, query };