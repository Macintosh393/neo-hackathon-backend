const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const errorMiddleware = require('./middlewares/error.middleware');
const swaggerDocument = require('../swagger.json');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Load rate limiter only in non-test environments
if (process.env.NODE_ENV !== 'test') {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      statusCode: 429,
      error: 'Too Many Requests',
      message: 'Too many requests from this IP, please try again after 15 minutes'
    }
  });
  app.use(limiter);
}

// Swagger UI Documentation Endpoint
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Mount main API routes router
app.use('/api', require('./routes'));

// Fallback for route not found
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.statusCode = 404;
  next(err);
});

// Global Error Handler (Handles celebrate and standard errors)
app.use(errorMiddleware);

module.exports = app;
