const router = require('express').Router();
const c = require('../controllers/reservationController');
const { protect } = require('../middleware/auth');

router.param('id', require('../middleware/validateObjectId'));
router.use(protect);
router.get('/availability', c.availability); // fixed paths before /:id
router.get('/facilities', c.facilities);
router.route('/').get(c.list).post(c.create);
router.patch('/:id/cancel', c.cancel);
router.patch('/:id/complete', c.complete);
router.route('/:id').get(c.get).put(c.update).delete(c.remove);

module.exports = router;
