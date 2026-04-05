const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { pubClient, subClient } = require('../config/socketRedis');
const { v4: uuidv4 } = require('uuid');
const redisClient = require('../config/redis');
let io;
const onlineUsers = new Map(); // fallback in-memory map

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.adapter(createAdapter(pubClient, subClient));

    io.on('connection', (socket) => {
        console.log(`Connected: ${socket.id}`);

        // ✅ USER JOIN
        socket.on('join', async (userId) => {
            userId = String(userId);
            socket.join(userId);

            await redisClient.set(`online:${userId}`, socket.id);
            onlineUsers.set(userId, socket.id);

            console.log(`User ${userId} online`);

            // ✅ LOAD CHAT HISTORY
            const result = await require("../db").query(
                `SELECT * FROM messages 
                 WHERE sender_id = $1 OR receiver_id = $1
                 ORDER BY created_at ASC`,
                [userId]
            );

            socket.emit("chat_history", result.rows);

            // ✅ DELIVER PENDING MESSAGES (sent OR delivered)
            const pending = await require("../db").query(
                `SELECT * FROM messages 
                 WHERE receiver_id = $1 AND status IN ('sent', 'delivered')
                 ORDER BY created_at ASC`,
                [userId]
            );

            for (let msg of pending.rows) {
                // Send to receiver
                socket.emit("receive_message", {
                    messageId: msg.id,
                    from: msg.sender_id,
                    message: msg.message,
                });

                // Mark delivered if needed
                if (msg.status === "sent") {
                    await require("../db").query(
                        `UPDATE messages SET status='delivered' WHERE id=$1`,
                        [msg.id]
                    );

                    io.to(String(msg.sender_id)).emit("message_delivered", {
                        messageId: msg.id
                    });
                }

                // ✅ MARK SEEN if receiver is online
                await require("../db").query(
                    `UPDATE messages SET status='seen' WHERE id=$1`,
                    [msg.id]
                );

                // Emit to sender AND receiver so both see "seen" instantly
                io.to(String(msg.sender_id)).emit("message_seen", {
                    messageId: msg.id
                });
                socket.emit("message_seen", {
                    messageId: msg.id
                });
            }
        });

        // ✅ SEND MESSAGE
        socket.on('send_message', async (data, callback) => {
            const { to, from, message } = data;
            const senderId = String(from);
            const receiverId = String(to);
            const messageId = uuidv4();

            // Save message as sent
            await require("../db").query(
                `INSERT INTO messages (id, sender_id, receiver_id, message, status)
                 VALUES ($1, $2, $3, $4, $5)`,
                [messageId, senderId, receiverId, message, "sent"]
            );

            // Sender sees instantly
            socket.emit('message_sent', {
                messageId,
                to: receiverId,
                message
            });

            // STEP 2: deliver only if receiver online
            const receiverSocketId = await redisClient.get(`online:${receiverId}`) || onlineUsers.get(receiverId);

            if (receiverSocketId) {
                io.to(receiverSocketId).emit('receive_message', {
                    messageId,
                    from: senderId,
                    message
                });

                // Mark delivered in DB
                await require("../db").query(
                    `UPDATE messages SET status='delivered' WHERE id=$1`,
                    [messageId]
                );

                // Notify sender of delivery
                io.to(senderId).emit("message_delivered", { messageId });
            }
        });

        // ✅ MESSAGE SEEN
        socket.on('message_seen', async ({ messageId }) => {
            const result = await require("../db").query(
                `UPDATE messages SET status='seen' WHERE id=$1 RETURNING sender_id, receiver_id`,
                [messageId]
            );

            const senderId = String(result.rows[0]?.sender_id);
            const receiverId = String(result.rows[0]?.receiver_id);
            if (!senderId || !receiverId) return;

            // Emit to both sender AND receiver for real-time sync
            io.to(senderId).emit("message_seen", { messageId });
            io.to(receiverId).emit("message_seen", { messageId });
        });

        // ✅ TYPING INDICATOR
        socket.on('typing', ({ to, from }) => {
            io.to(String(to)).emit('typing', { from });
        });

        // ✅ DISCONNECT
        socket.on('disconnect', async () => {
            console.log("User disconnected:", socket.id);
            for (let [userId, sockId] of onlineUsers.entries()) {
                if (sockId === socket.id) {
                    await redisClient.del(`online:${userId}`);
                    onlineUsers.delete(userId);
                    break;
                }
            }
        });
    });

    return io;
};

module.exports = { initSocket };