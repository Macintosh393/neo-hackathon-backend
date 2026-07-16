const express = require('express');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

app.use(express.json());

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// We will mount our routes router here in Phase 2
// app.use('/api', require('./routes'));

// Fallback for route not found
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.statusCode = 404;
  next(err);
});

// Global Error Handler (Handles celebrate and standard errors)
app.use(errorMiddleware);

module.exports = app;
