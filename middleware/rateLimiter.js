const redisClient = require('../config/redis');
const memoryStore = new Map();
const LIMIT = 10;
const WINDOW = 60;

exports.rateLimiter = async (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const key = `rate:${userId}`;
    try {

        const requests = await redisClient.incr(key);
        if(requests === 1) {
            await redisClient.expire(key, WINDOW);
        }

        if(requests > LIMIT) {
            return res.status(429).json({
                success: false,
                message: "Too many requests. Try again later."
            })
        }
        return next();
    } catch (error) {
        console.error("Rate Limiter Error: Redis down using memory fallback", error);

        // fallback
        const now = Date.now();
        const window = 60 * 1000;

        if (!memoryStore.has(key)) {
            memoryStore.set(key, { count: 1, start: now });
            return next();
        }

        const data = memoryStore.get(key);

        if (now - data.start > window) {
            memoryStore.set(key, { count: 1, start: now });
            return next();
        }

        data.count++;

        if (data.count > 100) {
            return res.status(429).json({ message: "Too many requests (fallback)" });
        }

        next();
    }
}