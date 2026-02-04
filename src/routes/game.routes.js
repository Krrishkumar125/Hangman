const express = require("express");
const { getGameHistory } = require("../controllers/game.controller");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.get("/history", protect, getGameHistory);

module.exports = router;
