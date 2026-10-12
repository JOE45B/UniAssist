const router = require('express').Router();
const c = require('../controllers/announcementController');
const { protect, optionalAuth, staffOnly } = require('../middleware/auth');

router.param('id', require('../middleware/validateObjectId'));
router.get('/active', c.active); // public feed; fixed path before /:id
router.get('/', optionalAuth, c.list);
router.get('/:id', optionalAuth, c.get);
router.post('/', protect, staffOnly, c.create);
router.put('/:id', protect, staffOnly, c.update);
router.delete('/:id', protect, staffOnly, c.remove);

module.exports = router;
