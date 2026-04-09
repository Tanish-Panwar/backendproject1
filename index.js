// const express = require('express');
// const router = require('./routes/userRoutes');
// const uploadRouter = require('./routes/uploadRoutes');
// const app = express();
// const logger = require('./middleware/logger');
// const errorHandler = require('./middleware/errorHandler');
// const PORT = process.env.PORT || 3000;

// app.use(express.json());
// app.use(logger);
// app.use(errorHandler);
// app.use('/users', router);
// app.use('/upload', uploadRouter);

// app.listen(PORT, (err) => {
//     if(!err) console.log("server running");
//     else console.log(err.message);
// })

const express = require('express');
const http = require('http');
const router = require('./routes/userRoutes');
const uploadRouter = require('./routes/uploadRoutes');
const chatRouter = require('./routes/chatRoutes');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const {initSocket} = require('./server/socket');
const app = express();
const server = http.createServer(app);
const cors = require('cors');

initSocket(server);

app.use(express.json());
app.use(logger);
app.use(cors());

app.use('/users', router);
app.use('/upload', uploadRouter);
app.use('/chat', chatRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

server.listen(PORT, ()=> {
    console.log("Server + Socket running");
})