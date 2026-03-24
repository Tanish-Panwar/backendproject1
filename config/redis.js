const { createClient } = require('redis');

const client = createClient({
  url: process.env.REDIS_URL, // IMPORTANT
});

client.on('error', (err) => {
  console.error('Redis error:', err);
});

(async () => {
  try {
    await client.connect();
    console.log('✅ Redis connected');
  } catch (err) {
    console.error('❌ Redis connection failed:', err);
  }
})();

module.exports = client;