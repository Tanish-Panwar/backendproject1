const {Queue} = require('bullmq');
const connection = require('../queue/connection');

const emailQueue = new Queue('emailQueue', {
    connection
});

module.exports = emailQueue;
