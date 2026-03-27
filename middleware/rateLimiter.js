const redisClient = require('../config/redis');
const LIMIT = 10;
const WINDOW = 60;

exports.rateLimiter = async (req, res, next) => {
    try {
        const userId = req.user?.id || req.ip;
        const key = `rate:${userId}`;

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
        next();
    } catch (error) {
        console.error("Rate Limiter Error: ", error);
        next();
    }
}