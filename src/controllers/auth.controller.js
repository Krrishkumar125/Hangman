const User = require("../models/User");
const { AppError, sendSuccess } = require("../utils/responseHandler");
const logger = require("../utils/logger");

const register = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    const existingUser = await User.findOne({
      username: username.toLowerCase(),
    });
    if (existingUser) {
      return next(new AppError("Username already taken", 409));
    }

    const user = await User.create({ username, password });

    const token = user.generateToken();

    const userResponse = {
      id: user._id,
      username: user.username,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      totalScore: user.totalScore,
    };

    logger.info(`New user registered: ${username}`);

    sendSuccess(
      res,
      { token, user: userResponse },
      "User registered successfully",
      201,
    );
  } catch (error) {
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message);
      return next(new AppError(messages.join(", "), 400));
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return next(new AppError("Please provide username and password", 400));
    }

    const user = await User.findOne({
      username: username.toLowerCase(),
    }).select("+password");

    if (!user) {
      return next(new AppError("Invalid credentials", 401));
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return next(new AppError("Invalid credentials", 401));
    }

    const token = user.generateToken();

    const userResponse = {
      id: user._id,
      username: user.username,
      gamesPlayed: user.gamesPlayed,
      gamesWon: user.gamesWon,
      totalScore: user.totalScore,
    };

    logger.info(`User logged in: ${username}`);

    sendSuccess(res, { token, user: userResponse }, "Login successful", 200);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
};
