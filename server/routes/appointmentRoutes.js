const router = require('express').Router();
const c = require('../controllers/appointmentController');
const { protect } = require('../middleware/auth');

router.param('id', require('../middleware/validateObjectId'));
router.use(protect);
router.get('/availability', c.availability); // fixed path before /:id
router.route('/').get(c.list).post(c.create);
router.patch('/:id/cancel', c.cancel);
router.patch('/:id/complete', c.complete);
router.route('/:id').get(c.get).put(c.update).delete(c.remove);

module.exports = router;
