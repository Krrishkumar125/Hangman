const app = require('./src/app');
const http = require('http');
const config = require('./src/config/server.config');
const logger = require('./src/utils/logger');
const { connectDB } = require('./src/config/db.config');
const { initializeSocket } = require('./src/config/socket.config');

const server = http.createServer(app);

const io = initializeSocket(server);

connectDB();

server.listen(config.port, () => {
  logger.info(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});