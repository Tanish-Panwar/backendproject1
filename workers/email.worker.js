const {Worker} = require('bullmq');
const connection = require('../queue/connection');

const worker = new Worker(
    'emailQueue',
    async (job) => {
        console.log("Processing job:", job.name);
        console.log("Data:", job.data);
        await new Promise(res => setTimeout(res, 2000));
        console.log(`Email sent to ${job.data.email}`);
    },
    {connection}
);

worker.on('completed', job => {
    console.log(`Job ${job.id} completed`);
})

worker.on('failed', (job, err) => {
    console.error(`Job failed: ${err.message}`);
})