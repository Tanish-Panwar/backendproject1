const { Server } = require('socket.io');
const {createAdapter} = require('@socket.io/redis-adapter');
const {pubClient, subClient} = require('../config/socketRedis');
const redisClient = require('../config/redis');
let io;
const onlineUsers = new Map(); // Now temporary fallback;

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.adapter(createAdapter(pubClient, subClient));

    io.on('connection', (socket) => {
        console.log(`Connected: ${socket.id}`);

        socket.on('join', async (userId) => {
            await redisClient.set(`online:${userId}`, socket.id); // main save
            onlineUsers.set(userId, socket.id) // fallback save.
            console.log(`User ${userId} online`);
        })

        socket.on('send_message', async (data) => {
            const {to, from, message} = data;
            await require("../db").query(
                `INSERT INTO messages (sender_id, receiver_id, message) VALUES ($1, $2, $3)`,
                [from, to, message]
            );
            let receiverSocketId = await redisClient.get(`online:${to}`);
            if(!receiverSocketId) {
                receiverSocketId = onlineUsers.get(to); // fallback.
            }
            if(receiverSocketId) {
                
                io.to(receiverSocketId).emit('receive_message', {
                    from, 
                    message,
                });
            }
        });

        socket.on('typing', async ({to, from}) => {
            let receiverSocketId = await redisClient.get(`online:${to}`);
            if(!receiverSocketId) {
                receiverSocketId = onlineUsers.get(to);
            }
            if(receiverSocketId) {
                io.to(receiverSocketId).emit('typing', {from});
            }
        });

        socket.on('disconnect', async () => {
            console.log("User disconnected: ", socket.id);

            for(let [userId, sockId] of onlineUsers.entries()) {
                if(sockId === socket.id) {
                    await redisClient.del(`online:${userId}`);
                    onlineUsers.delete(userId);
                    break;
                }
            }
        });
    });
    return io;
}


module.exports = {initSocket};