const router = require('express').Router();
const c = require('../controllers/serviceRequestController');
const { protect } = require('../middleware/auth');

router.param('id', require('../middleware/validateObjectId'));
router.use(protect);
router.get('/statistics', c.statistics); // fixed path before /:id
router.route('/').get(c.list).post(c.create);
router.patch('/:id/status', c.changeStatus);
router.route('/:id').get(c.get).put(c.update).delete(c.remove);

module.exports = router;
