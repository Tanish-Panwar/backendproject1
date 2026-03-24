const { createClient } = require('redis');

const client = createClient();

client.on('error', (err) => {
  console.log('Redis error:', err);
});

(async () => {
  await client.connect();
})();

module.exports = client;