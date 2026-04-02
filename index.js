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
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');
const {initSocket} = require('./server/socket');
const app = express();
const server = http.createServer(app);

initSocket(server);

app.use(express.json());
app.use(logger);

app.use('/users', router);
app.use('/upload', uploadRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

server.listen(PORT, ()=> {
    console.log("Server + Socket running");
})