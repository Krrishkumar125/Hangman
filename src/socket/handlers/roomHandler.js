const roomService = require("../../services/room.service");
const logger = require("../../utils/logger");

module.exports = (io, socket) => {
  socket.on("room:connect", ({ roomId }) => {
    try {
      const userRoom = roomService.getUserRoom(socket.userId);
      if (userRoom !== roomId) {
        socket.emit("error", { message: "You are not in this room" });
        return;
      }

      socket.join(roomId);

      roomService.linkSocketToUser(
        socket.id,
        socket.userId,
        socket.username,
        roomId,
      );

      logger.info(
        `Socket ${socket.id} (${socket.username}) connected to room ${roomId}`,
      );

      io.to(roomId).emit("player:connected", {
        username: socket.username,
        players: roomService.getRoomPlayers(roomId),
      });
    } catch (error) {
      logger.error(`Room connect error: ${error.message}`);
      socket.emit("error", { message: "Failed to connect to room" });
    }
  });

  socket.on("room:leave", () => {
    try {
      const roomId = roomService.getUserRoom(socket.userId);
      if (!roomId) return;

      socket.leave(roomId);
      roomService.removePlayerFromRoom(roomId, socket.userId);

      logger.info(`${socket.username} left room ${roomId}`);
    } catch (error) {
      logger.error(`Room leave error: ${error.message}`);
    }
  });

  socket.on("disconnect", () => {
    const userData = roomService.unlinkSocket(socket.id);

    if (userData && userData.roomId) {
      io.to(userData.roomId).emit("player:disconnected", {
        username: userData.username,
        players: roomService.getRoomPlayers(userData.roomId),
      });

      logger.info(
        `Socket ${socket.id} (${userData.username}) disconnected from room ${userData.roomId}`,
      );
    }
  });
};
