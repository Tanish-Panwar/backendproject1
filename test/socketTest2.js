const {io} = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on("connect", () => {
    console.log("Connected: ", socket.id);
    socket.emit("join", 1);

    socket.emit("join", 2);
});

socket.on("receive_message", (data) => {
    console.log("Message received:", data);
})

socket.on("typing", (data) => {
    console.log("Typing:", data);
})