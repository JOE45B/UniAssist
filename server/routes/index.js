const mongoose = require('mongoose');
const router = require('express').Router();
const dash = require('../controllers/dashboardController');
const { protect, staffOnly } = require('../middleware/auth');

// Health also pings MongoDB, so the footer status light and Render's health check
// report a lost database connection instead of only "the API process is up".
router.get('/health', async (req, res) => {
  const conn = mongoose.connection;
  let database = 'disconnected';
  if (conn.readyState === 1) {
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('ping timeout')), 3000));
    database = await Promise.race([conn.db.admin().ping(), timeout]).then(() => 'connected', () => 'unreachable');
  }
  const ok = database === 'connected';
  res.status(ok ? 200 : 503).json({ status: ok ? 'ok' : 'error', database, time: new Date(), ...(ok ? {} : { message: 'Database unavailable' }) });
});
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
