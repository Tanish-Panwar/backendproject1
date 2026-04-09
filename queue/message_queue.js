const {Queue} = require('bullmq');
const connection = require('./connection');

const messageQueue = new Queue('messageQueue', {
    connection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: false,
    }
})

module.exports = messageQueue;