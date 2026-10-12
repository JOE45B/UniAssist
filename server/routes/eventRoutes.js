const router = require('express').Router();
const c = require('../controllers/eventController');
const { protect, optionalAuth, staffOnly } = require('../middleware/auth');

router.param('id', require('../middleware/validateObjectId'));
router.get('/statistics', protect, c.statistics); // fixed path before /:id
router.get('/', optionalAuth, c.list);
router.post('/', protect, staffOnly, c.create);
router.get('/:id/availability', optionalAuth, c.availability);
router.get('/:id/registrations', protect, staffOnly, c.registrations);
router.post('/:id/register', protect, c.register);
router.delete('/:id/register', protect, c.unregister);
router.get('/:id', optionalAuth, c.get);
router.put('/:id', protect, staffOnly, c.update);
router.delete('/:id', protect, staffOnly, c.remove);

module.exports = router;
