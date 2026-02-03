const logger = require('../../utils/logger');

const connectionHandler = (io, socket) => {
  logger.info(`User connected: ${socket.username} (${socket.userId})`);

  socket.on('disconnect', (reason) => {
    logger.info(`User disconnected: ${socket.username} (${socket.userId}) - Reason: ${reason}`);
  });

  socket.on('error', (error) => {
    logger.error(`Socket error for user ${socket.username}: ${error.message}`);
  });
};

module.exports = connectionHandler;
