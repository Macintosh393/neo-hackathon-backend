import { fileURLToPath } from 'url';
import path from 'path';
import { startCronJob } from './jobs/cron.js';
import app from './app.js';
import config from './config/env.js';
import prisma from './prisma.js';
import { logger } from './config/logger.js';

/**
 * Initializes database connection and boots Express web server.
 */
async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    logger.info('[DB] Connection to database established successfully.');

    // Start nightly reschedule background cron job
    startCronJob();
    
    app.listen(config.port, () => {
      logger.info(`[Server] Time-Manager API running on port ${config.port}`);
    });
  } catch (error) {
    logger.error({ err: error }, '[DB] Connection initialization failure:');
    process.exit(1);
  }
}

// Prevent server execution when imported into test runners
const nodePath = fileURLToPath(import.meta.url);
if (process.argv[1] && (nodePath === process.argv[1] || path.resolve(nodePath) === path.resolve(process.argv[1]))) {
  startServer();
}
