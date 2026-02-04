const express = require("express");
const errorHandler = require("./middlewares/errorHandler");
const logger = require("./utils/logger");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/room", require("./routes/room.routes"));

app.use("*path", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

app.use(errorHandler);

module.exports = app;
