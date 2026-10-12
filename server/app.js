const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);

app.get('/', (req, res) => res.json({ name: 'UniAssist API', docs: 'See README.md', health: '/api/health' }));
app.use('/api', require('./routes'));

app.use(notFound);      // JSON 404 for anything no route matched
app.use(errorHandler);  // must be last

module.exports = app;
