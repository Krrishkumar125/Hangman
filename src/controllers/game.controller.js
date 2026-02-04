const Game = require('../models/Game');
const { sendSuccess } = require('../utils/responseHandler');

const getGameHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const games = await Game.find({ 
      players: userId 
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .select('word winner players scores createdAt');

    sendSuccess(res, games, 'Game history retrieved', 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
    getGameHistory,
};