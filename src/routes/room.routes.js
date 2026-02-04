const express = require("express");
const { createRoom, joinRoom } = require("../controllers/room.controller");
const { protect } = require("../middlewares/auth");
const {
  roomCreationValidation,
  joinRoomValidation,
  validate,
} = require("../middlewares/validator");

const router = express.Router();

router.post("/create", protect, roomCreationValidation, validate, createRoom);

router.post("/join/:roomId", protect, joinRoomValidation, validate, joinRoom);

module.exports = router;
