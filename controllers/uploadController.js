// const { uploadToCloudinary } = require('../services/upload_service');
// const pool = require('../db');
const imageQueue = require('../queue/image_queue');
const crypto = require('crypto');

exports.uploadImage = async (req, res) => {
    const jobId = crypto.createHash('sha256').update(req.user.id + req.file.originalname).digest('hex');
    await imageQueue.add('processImage', {
        userId: req.user.id,
        file: req.file.buffer.toString('base64')
    }, {
        jobId
    });


    res.json({
        success: true,
        message: "Image upload queued"
    })
}

// exports.uploadImage = async (req, res) => {
//     try {
//         if (!req.file) {
//             return res.status(400).json({
//                 success: false,
//                 message: "No File uploaded"
//             });
//         }

//         const result = await uploadToCloudinary(req.file.buffer);

//         await pool.query(
//             `UPDATE users SET profile_image = $1 WHERE id = $2`,
//             [result.secure_url.replace('/upload', '/upload/q_auto,f_auto/'), req.user.id]
//         );

//         res.json({
//             success: true,
//             url: result.secure_url.replace('/upload', '/upload/q_auto,f_auto/'),
//         })

//     } catch (err) {
//         console.error(err);
//         res.status(500).json({
//             success: false,
//         })
//     }
// };