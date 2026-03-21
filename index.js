const express = require('express');
const router = require('./routes/userRoutes');
const app = express();
const logger = require('./middleware/logger');

app.use(express.json());
app.use(logger);
app.use('/users', router);

const pool = require('./db');

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error(err);
  } else {
    console.log(res.rows);
  }
});

app.listen(3000, (err) => {
    if(!err) console.log("server running");
    else console.log(err.message);
})