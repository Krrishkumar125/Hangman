const dotenv = require('dotenv');

dotenv.config();

module.exports = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'production',
  mongodbUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpire: process.env.JWT_EXPIRE,
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 10,
};