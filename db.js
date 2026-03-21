const {Pool} = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'backend_db',
    password: 'iamadminofall90@*.!',
    port: 5432,
})

module.exports = pool;