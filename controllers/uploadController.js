const { uploadToCloudinary } = require('../services/upload_service');
const pool = require('../db');

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "No File uploaded"
            });
        }

        const result = await uploadToCloudinary(req.file.buffer);

        await pool.query(
            `UPDATE users SET profile_image = $1 WHERE id = $2`,
            [result.secure_url.replace('/upload', '/upload/q_auto,f_auto/'), req.user.id]
        );

        res.json({
            success: true,
            url: result.secure_url.replace('/upload', '/upload/q_auto,f_auto/'),
        })

    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
        })
    }
};