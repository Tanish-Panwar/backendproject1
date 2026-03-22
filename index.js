const express = require('express');
const router = require('./routes/userRoutes');
const app = express();
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/errorHandler');

app.use(express.json());
app.use(logger);
app.use(errorHandler);
app.use('/users', router);

app.listen(3000, (err) => {
    if(!err) console.log("server running");
    else console.log(err.message);
})