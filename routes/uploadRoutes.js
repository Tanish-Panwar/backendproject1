const express = require('express');
const router = express.Router();
const upload = require('../middleware/upload');
const {uploadImage} = require('../controllers/uploadController');
const AuthMid = require('../middleware/auth');
const { rateLimiterUpload } = require('../middleware/rateLimiterUpload');

router.post('/', AuthMid, rateLimiterUpload, upload.single('image'), uploadImage);
module.exports = router;