const mongoose = require("mongoose");
const logger = require("../utils/logger");
const config = require("./server.config");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodbUri);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      logger.error(`MongoDB connection error: ${err}`);
    });

    mongoose.connection.on("disconnected", () => {
      logger.warn("MongoDB disconnected");
    });
  } catch (error) {
    logger.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = { connectDB };
