require('dotenv').config();
const { Worker } = require('bullmq');
const connection = require('../queue/connection');
const db = require('../db');
const redisClient = require('../config/redis');

const worker = new Worker(
    'messageQueue',
    async (job) => {
        const { messageId, convoId, senderId, receiverId, message } = job.data;

        // ✅ INSERT (idempotent)
        await db.query(
            `INSERT INTO messages 
            (id, conversation_id, sender_id, receiver_id, message, status)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (id) DO NOTHING`,
            [messageId, convoId, senderId, receiverId, message, "sent"]
        );

        // ✅ PUBLISH EVENT (instead of socket emit)
        await redisClient.publish('chat_events', JSON.stringify({
            type: 'NEW_MESSAGE',
            data: {
                messageId,
                from: senderId,
                to: receiverId,
                message,
                conversationId: convoId
            }
        }));

        // ✅ MARK DELIVERED
        await db.query(
            `UPDATE messages SET status='delivered' WHERE id=$1`,
            [messageId]
        );

        // ✅ NOTIFY SENDER
        await redisClient.publish('chat_events', JSON.stringify({
            type: 'MESSAGE_DELIVERED',
            data: {
                messageId,
                senderId,
                receiverId
            }
        }));

        // ✅ UPDATE CONVERSATION
        await db.query(
            `UPDATE conversations 
            SET last_message = $1,
                last_message_at = NOW(),
                unread_count_user1 = CASE 
                    WHEN $2 = user1_id THEN unread_count_user1
                    ELSE unread_count_user1 + 1
                END,
                unread_count_user2 = CASE 
                    WHEN $2 = user2_id THEN unread_count_user2
                    ELSE unread_count_user2 + 1
                END
            WHERE id = $3`,
            [message, senderId, convoId]
        );

        // ✅ CACHE INVALIDATION
        await redisClient.del(`chatlist:${senderId}`);
        await redisClient.del(`chatlist:${receiverId}`);

        return job.data;
    },
    { connection }
);

worker.on('completed', (job) => {
    console.log(`Message job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
    console.error(`Message job failed: ${err.message}`);
});