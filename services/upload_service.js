const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier');

exports.uploadToCloudinary = (fileBuffer) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "backend-pro",
                resource_type: "image",
                transformation: [
                    {width: 500, height: 500, crop: "limit"},
                    {quality: "auto"},
                    {fetch_format: "auto"}
                ]
            },
            (error, result) => {
                if(result) resolve(result);
                else reject(error);
            }
        );
        streamifier.createReadStream(fileBuffer).pipe(stream);
    })
}