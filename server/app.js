const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const requestLogger = require('./middleware/logger');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

const origins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);

app.use('/api', require('./routes'));

// When the React app has been built (client/dist), serve it from this server too, so the whole
// site runs as one service (e.g. on Render). In development Vite serves it on :5173 instead.
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(path.join(clientDist, 'index.html'))) {
  app.use(express.static(clientDist));
  // Client-side routes such as /dashboard all load index.html; React Router takes it from there.
  app.use((req, res, next) => (req.method === 'GET' && !req.path.startsWith('/api') ? res.sendFile(path.join(clientDist, 'index.html')) : next()));
} else {
  app.get('/', (req, res) => res.json({ name: 'UniAssist API', docs: 'See README.md', health: '/api/health' }));
}

app.use(notFound);      // JSON 404 for anything no route matched
app.use(errorHandler);  // must be last

module.exports = app;
