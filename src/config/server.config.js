const dotenv = require("dotenv");

dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "production",
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE || "7d",
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
  clientUrl: process.env.CLIENT_URL || "*",
  dictionaryApiUrl: process.env.DICTIONARY_API_URL,
  maxPlayersPerRoom: parseInt(process.env.MAX_PLAYERS_PER_ROOM) || 6,
  maxIncorrectGuesses: parseInt(process.env.MAX_INCORRECT_GUESSES) || 6,
};
