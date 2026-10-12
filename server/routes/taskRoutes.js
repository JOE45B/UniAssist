const router = require('express').Router();
const c = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.param('id', require('../middleware/validateObjectId'));
router.use(protect);
router.get('/upcoming', c.upcoming); // fixed paths before /:id
router.get('/statistics', c.statistics);
router.route('/').get(c.list).post(c.create);
router.route('/:id').get(c.get).put(c.update).delete(c.remove);

module.exports = router;
