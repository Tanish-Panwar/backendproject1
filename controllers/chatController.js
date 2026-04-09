const redisClient = require('../config/redis');
const db = require('../db');

// GET CURRENT USER CHATLIST
exports.getChatList = async (req, res) => {
    const userId = req.user.id;

    const cacheKey = `chatlist:${userId}`;

    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return res.json(JSON.parse(cached));
    }

    const result = await db.query(
        `(
            SELECT id, user1_id, user2_id, last_message, last_message_at,
                unread_count_user1 AS unread_count
            FROM conversations
            WHERE user1_id = $1
        )
        UNION ALL
        (
            SELECT id, user1_id, user2_id, last_message, last_message_at,
                unread_count_user2 AS unread_count
            FROM conversations
            WHERE user2_id = $1
        )
        ORDER BY last_message_at DESC;`,
        [userId]
    );

    await redisClient.setEx(cacheKey, 60, JSON.stringify(result.rows));

    res.json({
        success: true,
        data: result.rows
    });
};

// GET MESSAGES PER CONVERSATION WITH CURSOR>
exports.getMessages = async (req, res) => {
    const { conversationId } = req.params;
    const limit = 20;
    const cursor = req.query.cursor;

    let query = `
        SELECT id, sender_id, message, created_at, status
        FROM messages
        WHERE conversation_id = $1
    `;

    const values = [conversationId];

    if (cursor) {
        query += ` AND created_at < $2`;
        values.push(cursor);
    }

    query += ` ORDER BY created_at DESC LIMIT ${limit}`;

    const result = await db.query(query, values);

    res.json({
        success: true,
        data: result.rows.reverse(),
        nextCursor: result.rows.length
            ? result.rows[result.rows.length - 1].created_at
            : null
    });
};