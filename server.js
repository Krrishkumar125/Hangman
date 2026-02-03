const app = require('./src/app');
const http = require('http');
const config = require('./src/config/server.config');
const logger = require('./src/utils/logger');

const server = http.createServer(app);

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