import apiRouter from './routes/index.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import errorMiddleware from './middlewares/error.middleware.js';
import swaggerDocument from '../swagger.json' with { type: 'json' };
import { httpLogger } from './config/logger.js';
import { NotFoundError } from './utils/AppError.js';

const app = express();

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigin?.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Cors: origin ${origin} is not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(httpLogger);

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
app.use('/api', apiRouter);

// Fallback for route not found — throws typed NotFoundError
app.use((req, res, next) => {
  next(new NotFoundError('Not Found'));
});

// Global Error Handler (Handles celebrate and standard errors)
app.use(errorMiddleware);

export default app;
