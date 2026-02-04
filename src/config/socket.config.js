const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const connectionHandler = require("../socket/handlers/connectionHandler");
const roomHandler = require("../socket/handlers/roomHandler");
const gameHandler = require("../socket/handlers/gameHandler");
const config = require("./server.config");

let io;

const initializeSocket = (server) => {
  io = socketIO(server, {
    cors: {
      origin: config.clientUrl,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        logger.warn(`Socket ${socket.id}: No token provided`);
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, config.jwtSecret);
      socket.userId = decoded.id;
      socket.username = decoded.username;

      logger.info(`Socket ${socket.id} authenticated as ${decoded.username}`);
      next();
    } catch (err) {
      logger.error(`Socket ${socket.id} auth failed: ${err.message}`);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    connectionHandler(io, socket);
    roomHandler(io, socket);
    gameHandler(io, socket);
  });

  logger.info("Socket.IO initialized");
  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
};

module.exports = { initializeSocket, getIO };
