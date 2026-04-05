const pool = require('../db');
const {v4: uuidv4} = require('uuid');

expprts.getOrCreateConversation = async (user1, user2) => {
    const u1 = Math.min(user1, user2);
    const u2 = Math.max(user1, user2);

    const result = await pool.query(
        `SELECT * FROM conversations WHERE user1_id=$1 AND user2_id=$2`,
        [u1, u2]
    );

    if(result.rows.length > 0) {
        return result.rows[0]
    }
    const id = uuidv4();
    const newConvo = await pool.query(
        `INSERT INTO conversations (id, user1_id, user2_id) VALUES ($1, $2, $3) RETURNING *`,
        [id, u1, u2]
    );

    return newConvo.rows[0]
}