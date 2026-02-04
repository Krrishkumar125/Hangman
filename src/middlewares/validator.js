const { body, param, validationResult } = require("express-validator");
const { AppError } = require("../utils/responseHandler");

const registerValidation = [
  body("username")
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be 3-20 characters")
    .matches(/^[a-z0-9_]+$/)
    .withMessage(
      "Username can only contain lowercase alphanumeric and underscores",
    ),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters"),
];

const loginValidation = [
  body("username").notEmpty().withMessage("Username is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const roomCreationValidation = [
  body("maxPlayers")
    .optional()
    .isInt({ min: 2, max: 10 })
    .withMessage("maxPlayers must be between 2 and 10"),
  body("password")
    .optional()
    .isLength({ min: 4, max: 20 })
    .withMessage("Room password must be 4-20 characters"),
];

const joinRoomValidation = [
  param("roomId")
    .notEmpty()
    .isLength({ min: 8, max: 8 })
    .withMessage("Invalid room ID format"),
  body("password")
    .optional()
    .isString()
    .withMessage("Password must be a string"),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map((err) => err.msg);
    return next(new AppError(messages.join(", "), 400));
  }
  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  roomCreationValidation,
  joinRoomValidation,
  validate,
};
