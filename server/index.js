require('dotenv').config();

const express = require('express');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const storage = require('./db/storage');
const { initializeDatabase, initializeDefaultUser, migrateFromJSON } = require('./db/schema');

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

// Middleware
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));

// Initialize database (SQLite)
try {
  const db = initializeDatabase();
  initializeDefaultUser(db);
  migrateFromJSON(db);
  // Store db instance for use in routes
  app.locals.db = db;
  storage.setDatabase(db);
} catch (error) {
  console.error('Failed to initialize database:', error);
  process.exit(1);
}

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/schedule', require('./routes/schedule'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/colors', require('./routes/colors'));
app.use('/api/notes', require('./routes/notes'));
app.use('/api/export', require('./routes/export'));
app.use('/api/import', require('./routes/import'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// In production, serve static React build
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../dist');
  app.use(express.static(buildPath));

  app.get('/', (req, res) => {
    res.sendFile(path.join(buildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    status: err.status || 500
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', status: 404 });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
