const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { pubClient, subClient } = require('../config/socketRedis');
const redisClient = require('../config/redis');
const { getOrCreateConversation } = require('../services/conversation_service');
const db = require('../db');
const messageQueue = require('../queue/message_queue');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

let io;

// ✅ RATE LIMIT
const rateLimitSocket = async (key, limit = 10, window = 1) => {
    const count = await redisClient.incr(key);
    if (count === 1) {
        await redisClient.expire(key, window);
    }
    return count <= limit;
};

const initSocket = async (server) => {
    io = new Server(server, {
        cors: { origin: "*" },
    });

    io.adapter(createAdapter(pubClient, subClient));

    // ✅ AUTH MIDDLEWARE
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error("No token"));

            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            const result = await db.query(
                `SELECT id FROM users WHERE id=$1`,
                [decoded.id]
            );

            if (result.rows.length === 0) {
                return next(new Error("User not found"));
            }

            socket.user = { id: String(decoded.id) };
            next();
        } catch (err) {
            return next(new Error("Unauthorized"));
        }
    });

    // ✅ REDIS SUBSCRIBER (FOR EVENTS)
    const subscriber = redisClient.duplicate();
    await subscriber.connect();

    subscriber.subscribe('chat_events', async (msg) => {
        try {
            const event = JSON.parse(msg);

            // 🔥 NEW MESSAGE
            if (event.type === 'NEW_MESSAGE') {
                const { messageId, from, to, message, conversationId } = event.data;

                const receiverSockets = await redisClient.sMembers(`online:${to}`);

                receiverSockets.forEach(sockId => {
                    io.to(sockId).emit('receive_message', {
                        messageId,
                        from,
                        message,
                        conversationId
                    });
                });
            }

            // 🔥 DELIVERED
            if (event.type === 'MESSAGE_DELIVERED') {
                const { messageId, senderId } = event.data;

                const senderSockets = await redisClient.sMembers(`online:${senderId}`);

                senderSockets.forEach(sockId => {
                    io.to(sockId).emit("message_delivered", { messageId });
                });
            }

        } catch (err) {
            console.error("Redis subscriber error:", err);
        }
    });

    io.on('connection', (socket) => {
        console.log(`Connected: ${socket.id}`);

        // ✅ JOIN
        socket.on('join', async () => {
            try {
                const userId = String(socket.user.id);
                const userKey = `online:${userId}`;

                socket.join(userId);

                // ✅ ADD SOCKET TO SET
                await redisClient.sAdd(userKey, socket.id);

                // ✅ SET TTL ONLY IF NOT SET
                await redisClient.expire(userKey, 60);

                // ✅ KEEP ALIVE (NO MEMORY LEAK)
                if (socket.keepAlive) clearInterval(socket.keepAlive);

                socket.keepAlive = setInterval(async () => {
                    await redisClient.expire(userKey, 60);
                }, 30000);

                // ✅ DISCONNECT
                socket.on('disconnect', async () => {
                    clearInterval(socket.keepAlive);
                    await redisClient.sRem(userKey, socket.id);
                    console.log(`Disconnected: ${socket.id}`);
                });

            } catch (err) {
                console.error("join error:", err);
            }
        });

        // ✅ SEND MESSAGE
        socket.on('send_message', async (data, callback) => {
            try {
                const { message } = data;

                if (!message || message.trim() === "") return;

                const senderId = String(socket.user.id);
                const receiverId = String(data.to);

                const allowed = await rateLimitSocket(`msg:${senderId}`);
                if (!allowed) {
                    return socket.emit("error", "Too many messages");
                }

                if (!receiverId || receiverId === senderId) return;

                // ✅ VALIDATE RECEIVER
                const checkUser = await db.query(
                    `SELECT id FROM users WHERE id=$1`,
                    [receiverId]
                );

                if (checkUser.rows.length === 0) return;

                const convo = await getOrCreateConversation(senderId, receiverId);
                if (!convo) return;

                const messageId = uuidv4();

                await messageQueue.add('sendMessage', {
                    messageId,
                    convoId: convo.id,
                    senderId,
                    receiverId,
                    message
                }, {
                    jobId: messageId,
                    removeOnComplete: true,
                    lifo: false // FIFO
                });

                // ✅ ACK
                socket.emit('message_sent', {
                    messageId,
                    to: receiverId,
                    message
                });

                if (callback) {
                    callback({ status: "ok", messageId });
                }

            } catch (err) {
                console.error("send_message error:", err);
            }
        });

        // ✅ MESSAGE SEEN
        socket.on('message_seen', async ({ messageId, conversationId }) => {
            try {
                const userId = String(socket.user.id);

                await db.query(
                    `UPDATE messages SET status='seen' WHERE id=$1`,
                    [messageId]
                );

                await db.query(
                    `UPDATE conversations
                     SET 
                        unread_count_user1 = CASE 
                            WHEN user1_id = $1 THEN 0 ELSE unread_count_user1 END,
                        unread_count_user2 = CASE 
                            WHEN user2_id = $1 THEN 0 ELSE unread_count_user2 END
                     WHERE id = $2`,
                    [userId, conversationId]
                );

                const result = await db.query(
                    `SELECT sender_id, receiver_id FROM messages WHERE id=$1`,
                    [messageId]
                );

                const senderId = String(result.rows[0]?.sender_id);
                const receiverId = String(result.rows[0]?.receiver_id);

                const sockets = [
                    ...(await redisClient.sMembers(`online:${senderId}`)),
                    ...(await redisClient.sMembers(`online:${receiverId}`))
                ];

                sockets.forEach(sockId => {
                    io.to(sockId).emit("message_seen", { messageId });
                });

            } catch (err) {
                console.error("message_seen error:", err);
            }
        });

        // ✅ TYPING
        socket.on('typing', async ({ to }) => {
            try {
                const from = String(socket.user.id);
                // console.log("TYPING:", from, "->", to);
                if (!to || to === from) return;


                // const allowed = await rateLimitSocket(`typing:${from}`, 5000, 1);
                // if (!allowed) return;

                const receiverSockets = await redisClient.sMembers(`online:${to}`);
                // console.log("Typing -> receiver sockets:", receiverSockets);

                receiverSockets.forEach(sockId => {
                    io.to(sockId).emit('typing', { from });
                });

            } catch (err) {
                console.error("typing error:", err);
            }
        });
    });

    return io;
};

module.exports = { initSocket };