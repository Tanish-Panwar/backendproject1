const redisClient = require('../config/redis');
const memoryStore = new Map();
const LIMIT = 5;
const WINDOW = 60;

exports.rateLimiterUpload = async (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const redisKey = `rateUpload:${userId}`
    try {

        const requests = await redisClient.incr(redisKey);
        if(requests === 1) {
            await redisClient.expire(redisKey, WINDOW);
        }

        if(requests > LIMIT) {
            return res.status(429).json({
                success: false,
                message: "Too many uploads in 1 minute. Try again after 1 min."
            });
        }
        return next();
    } catch (err) {
        console.error("Upload Rate Limiter Error: Redis down", err);
        
        // fallback
        const now = Date.now();
        const window = 60 * 1000;

        if (!memoryStore.has(redisKey)) {
            memoryStore.set(redisKey, { count: 1, start: now });
            return next();
        }

        const data = memoryStore.get(redisKey);

        if (now - data.start > window) {
            memoryStore.set(redisKey, { count: 1, start: now });
            return next();
        }

        data.count++;

        if (data.count > 100) {
            return res.status(429).json({ message: "Too many requests (fallback)" });
        }
        next();
    }
}