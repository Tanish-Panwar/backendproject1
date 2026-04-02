const {createClient} = require('redis');

const pubClient = createClient({
    url: process.env.REDIS_URL,
});

const subClient = pubClient.duplicate();

(async () => {
    await pubClient.connect();
    await subClient.connect();
    console.log("Socket Redis Connected");
})();

module.exports = {pubClient, subClient};