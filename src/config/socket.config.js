const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const connectionHandler = require('../socket/handlers/connectionHandler');
const { config } = require('dotenv');

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CLIENT_URL || '*',
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      socket.userId = decoded.id;
      socket.username = decoded.username;
      
      next();
    } catch (err) {
      logger.error(`Socket auth error: ${err.message}`);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    connectionHandler(io, socket);
  });

  logger.info('Socket.IO initialized');
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

module.exports = { initializeSocket, getIO };
