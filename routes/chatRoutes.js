const express = require('express');
const router = express.Router();
const controller = require('../controllers/chatController');
const authMiddleware = require('../middleware/auth');

router.get('/list', authMiddleware, controller.getChatList);
router.get('/:conversationId/messages/', authMiddleware, controller.getMessages);

module.exports = router;