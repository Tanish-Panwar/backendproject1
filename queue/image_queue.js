const {Queue} = require('bullmq');
const connection = require('./connection');

const imageQueue = new Queue('imageQueue', {
    connection, 
});

module.exports = imageQueue;