const pool = require('../db');
const asyncHandler = require('../utils/asyncHandler');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const redisClient = require('../config/redis');

// CREATE USER Register.
exports.register = asyncHandler(async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ success: false });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(`
        INSERT INTO users (name, email, password)
        VALUES ($1, $2, $3)
        RETURNING id, name, email
    `, [name, normalizedEmail, hashedPassword]);

    // 🔥 Invalidate caches
    try {
        await redisClient.flushAll(); // clear full cache
    } catch (err) {
        console.error("Redis DEL failed:", err);
    }

    res.status(201).json({
        success: true,
        data: result.rows[0],
    });
});


// LOGIN
exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await pool.query( // Already Used Indexing in DB for faster lookups.
        `SELECT * FROM users WHERE email = $1`,
        [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid Email' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid Password' });
    }

    const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );

    res.json({
        success: true,
        token,
    });
});


// GET SINGLE USER INFO (with Redis)
exports.userInfo = asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const cacheKey = `user:${userId}`;

    let cachedData;

    try {
        cachedData = await redisClient.get(cacheKey);
    } catch (err) {
        console.error("Redis GET failed:", err);
    }

    if (cachedData) {
        return res.json({
            success: true,
            data: JSON.parse(cachedData),
            source: "cache"
        });
    }

    const result = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [userId]
    );

    const user = result.rows[0];

    // 🔥 Cache this user
    try {
        await redisClient.setEx(cacheKey, 300, JSON.stringify(user));
    } catch (err) {
        console.error("Redis SET failed:", err);
    }

    res.json({
        success: true,
        data: user,
        source: "db"
    });
});


// GET ALL USERS (with Redis)
exports.getUsers = asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const cursor = parseInt(req.query.cursor) || 0;

    const cacheKey = `users:${req.user.id}:cursor:${cursor}:limit:${limit}`;

    let cachedData;

    try {
        cachedData = await redisClient.get(cacheKey);
    } catch (err) {
        console.error("Redis GET failed:", err);
    }

    if (cachedData) {
        return res.status(200).json({
            success: true,
            data: JSON.parse(cachedData),
            source: "cache"
        });
    }

    const result = await pool.query(
        `SELECT id, name, email, created_at FROM users WHERE id > $1 ORDER BY id LIMIT $2`,
        [cursor, limit]
    );

    const users = result.rows;

    // 🔥 Cache list
    try {
        await redisClient.setEx(cacheKey, 120, JSON.stringify(users));
    } catch (err) {
        console.error("Redis SET failed:", err);
    }

    res.json({
        success: true,
        data: users,
        nextCursor: users.length ? users[users.length -1].id : null,
        source: "db"
    });
});