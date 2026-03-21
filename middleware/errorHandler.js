module.exports = (err, req, res, next) => {
    console.error(err);
    
    if (err.code === '23505') {
        return res.status(409).json({
        success: false,
        message: "Duplicate entry"
        });
    }

    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
}