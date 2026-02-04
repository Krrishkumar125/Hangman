const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  roomId: String,
  word: String,
  wordMaster: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  players: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  scores: Map,
  totalGuesses: Number,
  incorrectGuesses: [String],
  duration: Number, 
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Game', gameSchema);
