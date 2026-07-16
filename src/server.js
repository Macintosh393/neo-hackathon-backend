const app = require('./app');
const config = require('./config/env');
const prisma = require('./prisma');

/**
 * Initializes database connection and boots Express web server.
 */
async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect();
    console.log('[DB] Connection to database established successfully.');
    
    app.listen(config.port, () => {
      console.log(`[Server] Time-Manager API running on port ${config.port}`);
    });
  } catch (error) {
    console.error('[DB] Connection initialization failure:', error);
    process.exit(1);
  }
}

// Prevent server execution when imported into test runners
if (require.main === module) {
  startServer();
}
