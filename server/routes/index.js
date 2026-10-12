const router = require('express').Router();
const dash = require('../controllers/dashboardController');
const { protect, staffOnly } = require('../middleware/auth');

router.get('/health', (req, res) => res.json({ status: 'ok', time: new Date() }));
router.get('/meta', dash.meta);
router.use('/auth', require('./authRoutes'));
router.use('/users', require('./userRoutes'));
router.use('/schedules', require('./scheduleRoutes'));
router.use('/tasks', require('./taskRoutes'));
router.use('/service-requests', require('./serviceRequestRoutes'));
router.use('/appointments', require('./appointmentRoutes'));
router.use('/reservations', require('./reservationRoutes'));
router.use('/announcements', require('./announcementRoutes'));
router.use('/events', require('./eventRoutes'));
router.get('/dashboard/statistics', protect, dash.statistics);
router.get('/dashboard/analytics', protect, staffOnly, dash.analytics);
router.get('/search', protect, dash.search);

module.exports = router;
