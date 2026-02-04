const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const config = require("../config/server.config");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, "Username is required"],
    unique: true,
    trim: true,
    lowercase: true,
    minlength: [3, "Username must be at least 3 characters"],
    maxlength: [20, "Username must not exceed 20 characters"],
    match: [
      /^[a-z0-9_]+$/,
      "Username can only contain lowercase letters, numbers, and underscores",
    ],
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: [6, "Password must be at least 6 characters"],
    select: false,
  },
  gamesPlayed: {
    type: Number,
    default: 0,
  },
  gamesWon: {
    type: Number,
    default: 0,
  },
  totalScore: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, config.bcryptRounds);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generateToken = function () {
  return jwt.sign({ id: this._id, username: this.username }, config.jwtSecret, {
    expiresIn: config.jwtExpire,
  });
};

module.exports = mongoose.model("User", userSchema);
