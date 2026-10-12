const router = require('express').Router();
const c = require('../controllers/scheduleController');
const { protect } = require('../middleware/auth');

router.param('id', require('../middleware/validateObjectId'));
router.use(protect);
router.get('/conflicts', c.conflicts); // fixed path before /:id
router.route('/').get(c.list).post(c.create);
router.route('/:id').get(c.get).put(c.update).delete(c.remove);

module.exports = router;
