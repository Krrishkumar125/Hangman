const jwt = require("jsonwebtoken");
const { AppError } = require("../utils/responseHandler");
const User = require("../models/User");
const config = require("../config/server.config");

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return next(new AppError("Not authorized, no token provided", 401));
    }

    const decoded = jwt.verify(token, config.jwtSecret);

    const user = await User.findById(decoded.id);
    if (!user) {
      return next(new AppError("User no longer exists", 401));
    }

    req.user = {
      id: user._id,
      username: user.username,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return next(new AppError("Invalid token", 401));
    }
    if (error.name === "TokenExpiredError") {
      return next(new AppError("Token expired", 401));
    }
    next(error);
  }
};

module.exports = {
  protect,
};
