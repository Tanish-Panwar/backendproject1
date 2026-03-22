const express = require('express');
const router = express.Router();
const controller = require('../controllers/userController');
const authMiddleware = require('../middleware/auth');

// Routes...

router.get('/', controller.login);
router.post('/', controller.register);
router.get('/me', authMiddleware, controller.userInfo);
// router.get('/:id', controller.getUserById);
// router.put('/:id', controller.updateUser);
// router.delete('/:id', controller.deleteUser);

module.exports = router;