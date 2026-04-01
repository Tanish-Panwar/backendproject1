const multer = require('multer');
const storage  = multer.memoryStorage();
const allowedTypes = ['image/jpeg', 'image']

const upload = multer({
    storage,
    limits: {fileSize: 5*1024*1024} // 5 MB,
});

module.exports = upload