const express = require('express');
const router = express.Router();
const controller = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');
const { rateLimiter } = require('../middleware/rateLimiter');

// Routes...

router.get('/', controller.login);
router.post('/', controller.register);
router.get('/me', authMiddleware, rateLimiter, controller.userInfo);
router.get('/all', authMiddleware, rateLimiter, controller.getUsers);

module.exports = router;