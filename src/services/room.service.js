const logger = require('../utils/logger');
const { getIO } = require('../config/socket.config');

const activeRooms = new Map();
const playerRooms = new Map();
const socketUsers = new Map();

class RoomService {
  
  createRoom(roomId, hostId, hostUsername) {
    activeRooms.set(roomId, {
      players: [{ id: hostId, username: hostUsername, isHost: true, socketId: null }],
      currentGame: null,
      host: hostId,
      createdAt: Date.now()
    });
    
    playerRooms.set(hostId, roomId);
  }

  addPlayerToRoom(roomId, userId, username) {
    const room = activeRooms.get(roomId);
    if (!room) {
      throw new Error('Room not found in active rooms');
    }

    if (room.players.length >= room.maxPlayers) {
       throw new Error('Room is full');
    }  
      
    const existingPlayer = room.players.find(p => p.id === userId);
    if (existingPlayer) {
      logger.warn(`Player ${username} attempted duplicate join to room ${roomId}`);
      return;
    }

    room.players.push({
      id: userId,
      username,
      isHost: false,
      socketId: null
    });

    playerRooms.set(userId, roomId);

    this.broadcastToRoom(roomId, 'player:joined', {
      username,
      players: this.getRoomPlayers(roomId)
    });
  }

  removePlayerFromRoom(roomId, userId) {
    const room = activeRooms.get(roomId);
    if (!room) return;

    const playerIndex = room.players.findIndex(p => p.id === userId);
    if (playerIndex === -1) return;

    const removedPlayer = room.players[playerIndex];
    room.players.splice(playerIndex, 1);
    playerRooms.delete(userId);

    if (room.players.length === 0) {
      activeRooms.delete(roomId);
      logger.info(`Room ${roomId} destroyed (no players)`);
      return;
    }

    if (removedPlayer.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
      room.host = room.players[0].id;
      
      this.broadcastToRoom(roomId, 'host:transferred', {
        newHost: room.players[0].username
      });
    }

    this.broadcastToRoom(roomId, 'player:left', {
      username: removedPlayer.username,
      players: this.getRoomPlayers(roomId)
    });
  }

  isUserInRoom(userId) {
    return playerRooms.has(userId);
  }

  getUserRoom(userId) {
    return playerRooms.get(userId);
  }

  getRoomPlayers(roomId) {
    const room = activeRooms.get(roomId);
    if (!room) return [];
    
    return room.players.map(p => ({
      id: p.id,
      username: p.username,
      isHost: p.isHost,
      connected: p.socketId !== null
    }));
  }

  linkSocketToUser(socketId, userId, username, roomId) {
    socketUsers.set(socketId, { userId, username, roomId });
    
    const room = activeRooms.get(roomId);
    if (room) {
      const player = room.players.find(p => p.id === userId);
      if (player) {
        player.socketId = socketId;
      }
    }
  }

  unlinkSocket(socketId) {
    const userData = socketUsers.get(socketId);
    socketUsers.delete(socketId);

    if (userData && userData.roomId) {
      const room = activeRooms.get(userData.roomId);
      if (room) {
        const player = room.players.find(p => p.id === userData.userId);
        if (player) {
          player.socketId = null;
        }
      }
    }

    return userData;
  }

  broadcastToRoom(roomId, event, data) {
    try {
      const io = getIO();
      io.to(roomId).emit(event, data);
    } catch (error) {
      logger.error(`Broadcast to room ${roomId} failed: ${error.message}`);
    }
  }

  getActiveRooms() {
    return Array.from(activeRooms.entries()).map(([roomId, room]) => ({
      roomId,
      playerCount: room.players.length,
      host: room.players.find(p => p.isHost)?.username
    }));
  }
}

module.exports = new RoomService();
