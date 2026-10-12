const router = require('express').Router();
const c = require('../controllers/userController');
const { protect, adminOnly } = require('../middleware/auth');

router.param('id', require('../middleware/validateObjectId'));
router.use(protect);
router.get('/staff', c.staff); // fixed path before /:id
router.use(adminOnly);
router.route('/').get(c.list).post(c.create);
router.route('/:id').get(c.get).put(c.update).delete(c.remove);

module.exports = router;
