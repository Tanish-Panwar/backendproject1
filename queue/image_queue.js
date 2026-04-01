const {Queue} = require('bullmq');
const connection = require('./connection');

const imageQueue = new Queue('imageQueue', {
    connection, 
    defaultJobOptions: {
        attempts: 3, // so job can be retried.
        backoff: {
            type: 'exponential', // retry delay grows exponentially.
            delay: 2000, // base delay.
        },
        removeOnComplete: true, 
        removeOnFail: false, // keeping not working jobs for debugging.
    },
});

module.exports = imageQueue;