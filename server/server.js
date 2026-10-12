require('dotenv').config({ quiet: true });
const connectDB = require('./config/db');
const app = require('./app');

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is not set. Copy server/.env.example to server/.env.');
    await connectDB();
    await Promise.all(Object.values(require('mongoose').models).map((m) => m.init())); // make sure unique indexes exist
    app.listen(PORT, () => console.log(`UniAssist API listening on http://localhost:${PORT}`));
  } catch (err) {
    console.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
})();
