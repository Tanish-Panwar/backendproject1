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
        return res.status(400).json({ success: false })
    }

    const normalizedEmail = email.toLowerCase().trim();
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(`
        INSERT into users (name, email, password) values
        ($1, $2, $3) returning id, name, email
        `, [name, normalizedEmail, hashedPassword]
    );

    res.status(201).json({
        success: true,
        data: result.rows[0],
    })
})



exports.login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await pool.query(
        `SELECT * from users where email = $1`,
        [email.toLowerCase().trim()]
    )
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
    })

});



exports.userInfo = asyncHandler(async (req, res) => {
    const user = await pool.query(
        'SELECT id, name, email FROM users WHERE id = $1',
        [req.user.id]
    );

    res.json({
        success: true,
        data: user.rows[0],
    });
});


exports.getUsers = asyncHandler( async (req, res) => {
    const cacheKey = "users:all";

    const cachedData = await redisClient.get(cacheKey);

    if(cachedData) {
        return res.status(200).json({
            success: true,
            data: JSON.parse(cachedData),
            source: "cache"
        })
    }

    const result = await pool.query(`SELECT id, name, email, created_at from users`);

    await redisClient.setEx(cacheKey, 120, JSON.stringify(result.rows));


    res.json({
        success: true,
        data: result.rows,
        source: "db"
    })
})