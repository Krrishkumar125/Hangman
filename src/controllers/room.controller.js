const Room = require('../models/Room');
const roomService = require('../services/room.service');
const { AppError, sendSuccess } = require('../utils/responseHandler');
const logger = require('../utils/logger');

const createRoom = async (req, res, next) => {
  try {
    const { maxPlayers = 6, password } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    if (roomService.isUserInRoom(userId)) {
      return next(new AppError('You are already in a room. Leave current room first.', 409));
    }

    const room = await Room.create({
      host: userId,
      hostUsername: username,
      maxPlayers,
      password,
      isPasswordProtected: !!password
    });

    roomService.createRoom(room.roomId, userId, username);

    logger.info(`Room ${room.roomId} created by ${username}`);

    const response = {
      roomId: room.roomId,
      host: username,
      maxPlayers: room.maxPlayers,
      isPasswordProtected: room.isPasswordProtected,
      status: room.status,
      players: roomService.getRoomPlayers(room.roomId)
    };

    sendSuccess(res, response, 'Room created successfully', 201);
  } catch (error) {
    next(error);
  }
};

const joinRoom = async (req, res, next) => {
  try {
    const { roomId } = req.params;
    const { password } = req.body;
    const userId = req.user.id;
    const username = req.user.username;

    if (roomService.isUserInRoom(userId)) {
      return next(new AppError('You are already in a room. Leave current room first.', 409));
    }

    const room = await Room.findOne({ roomId }).select('+password');
    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    const currentPlayers = roomService.getRoomPlayers(roomId);
    if (currentPlayers && currentPlayers.length >= room.maxPlayers) {
      return next(new AppError('Room is full', 409));
    }

    if (room.status === 'active') {
      return next(new AppError('Game already in progress', 409));
    }

    if (room.isPasswordProtected) {
      if (!password) {
        return next(new AppError('Room password required', 401));
      }
      const isPasswordValid = await room.comparePassword(password);
      if (!isPasswordValid) {
        return next(new AppError('Invalid room password', 401));
      }
    }

    roomService.addPlayerToRoom(roomId, userId, username);

    logger.info(`${username} joined room ${roomId}`);

    const response = {
      roomId: room.roomId,
      host: room.hostUsername,
      maxPlayers: room.maxPlayers,
      isPasswordProtected: room.isPasswordProtected,
      status: room.status,
      players: roomService.getRoomPlayers(roomId)
    };

    sendSuccess(res, response, 'Joined room successfully', 200);
  } catch (error) {
    next(error);
  }
};


module.exports = {
  createRoom,
  joinRoom,
};