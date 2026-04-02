const {io} = require('socket.io-client');

const socket = io('http://localhost:3000');

socket.on("connect", () => {
    console.log("Connected: ", socket.id);
    socket.emit("join", 1);

    setTimeout(() => {
        for(let i=0; i<5; i++) {
            socket.emit("send_message", {
                from: 1,
                to: 2,
                message: "Spam" + i,
            });
        }
    }, 2000);
    setTimeout(() => {
        socket.emit("typing", {
            from: 1,
            to: 2
        });
    }, 1000);
});

socket.on("receive_message", (data) => {
    console.log("Message received:", data);
})

socket.on("typing", (data) => {
    console.log("Typing:", data);
})