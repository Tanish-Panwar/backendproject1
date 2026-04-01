require('dotenv').config();
const {Worker} = require("bullmq");
const connection = require('../queue/connection');
const {uploadToCloudinary} = require('../services/upload_service');
const pool = require('../db');

const worker = new Worker(
    'imageQueue',
    async (job) => {
        const {userId, file} = job.data;
        const buffer = Buffer.from(file, 'base64');
        const result = await Promise.race([
            uploadToCloudinary(buffer),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Upload timeout")), 10000),)
        ]);

        await pool.query(
            `UPDATE users SET profile_image = $1 WHERE id = $2`,
            [result.secure_url.replace('/upload', '/upload/q_auto,f_auto/'), userId]
        );
        console.log('Image Processed', result.secure_url.replace('/upload', '/upload/q_auto,f_auto/'));
    },
    {connection}
);

worker.on('active', job => {
    console.log("JOB ACTIVE");
})

worker.on('completed', job => {
    console.log(`Job ${job.id} completed`);
})

worker.on('failed', async (job, err) => {
    console.error(`Job failed: ${err.message}`);
    await connection.lpush(
        'failed:imageQueue',
        JSON.stringify({
            jobId: job.id,
            data: job.data,
            error: err.message
        })
    );
})