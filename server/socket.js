const { Server } = require('socket.io');
let io;
const onlineUsers = new Map();

const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
        },
    });

    io.on('connection', (socket) => {
        console.log(`Connected: ${socket.id}`);

        socket.on('join', (userId) => {
            onlineUsers.set(userId, socket.id)
            console.log(`User ${userId} online`);
        })

        socket.on('send_message', ({to, from, message}) => {
            const receiverSocket = onlineUsers.get(to);
            if(receiverSocket) {
                io.to(receiverSocket).emit('receive_message', {
                    from, 
                    message,
                });
            }
        });

        socket.on('typing', ({to, from}) => {
            const receiverSocket = onlineUsers.get(to);
            if(receiverSocket) {
                io.to(receiverSocket).emit('typing', {from});
            }
        });

        socket.on('disconnect', () => {
            console.log("Disconnected: ", socket.id);

            for(let [userId, sockId] of onlineUsers.entries()) {
                if(sockId === socket.id) {
                    onlineUsers.delete(userId);
                    break;
                }
            }
        });
    });
    return io;
}


module.exports = {initSocket};