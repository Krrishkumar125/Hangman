const gameService = require("../../services/game.service");
const roomService = require("../../services/room.service");
const logger = require("../../utils/logger");

module.exports = (io, socket) => {
  socket.on("game:start", async () => {
    try {
      const roomId = roomService.getUserRoom(socket.userId);
      if (!roomId) {
        socket.emit("error", { message: "You are not in a room" });
        return;
      }

      const room = roomService.getRoom(roomId);
      if (room.host !== socket.userId) {
        socket.emit("error", { message: "Only host can start the game" });
        return;
      }

      const gameState = await gameService.startGame(roomId);

      const wordMasterPlayer = room.players.find(
        (p) => p.id === gameState.wordMaster,
      );
      const wordMasterSocket = io.sockets.sockets.get(
        wordMasterPlayer.socketId,
      );

      if (wordMasterSocket) {
        wordMasterSocket.emit("game:started", {
          message: "You are the word master!",
          gameState: { ...gameState, hiddenWord: gameState.word },
          currentPlayer: room.players.find(
            (p) => p.id === gameState.currentTurn,
          )?.username,
        });
      }

      socket.to(roomId).emit("game:started", {
        message: "Game has started!",
        gameState,
        currentPlayer: room.players.find((p) => p.id === gameState.currentTurn)
          ?.username,
      });
    } catch (error) {
      logger.error(`Game start error: ${error.message}`);
      socket.emit("error", { message: error.message });
    }
  });

  socket.on("game:guess", async ({ letter }, ack) => {
    try {
      const roomId = roomService.getUserRoom(socket.userId);
      const result = await gameService.makeGuess(roomId, socket.userId, letter);

      if (result.reason) {
        io.to(roomId).emit("game:ended", {
          reason: result.reason,
          winner: result.winner,
          word: result.word,
          scores: result.scores,
          gameState: result.gameState,
        });
        if (ack) ack({ success: true, gameEnded: true });
      } else {
        io.to(roomId).emit("game:guess-result", {
          player: socket.username,
          letter: result.letter,
          isCorrect: result.isCorrect,
          gameState: result.gameState,
          currentPlayer: result.currentPlayer,
        });
        if (ack) ack({ success: true, gameEnded: false });
      }
    } catch (error) {
      logger.error(`Guess error: ${error.message}`);
      if (ack) ack({ success: false, error: error.message });
      else socket.emit("error", { message: error.message });
    }
  });

  socket.on("game:check-end", () => {
    try {
      const roomId = roomService.getUserRoom(socket.userId);
      if (!roomId) return;

      const game = gameService.getActiveGame(roomId);
      if (game && game.status === "finished") {
        socket.emit(
          "game:ended",
          gameService.getGameStateForBroadcast(game, true),
        );
      }
    } catch (error) {
      logger.error(`Check end error: ${error.message}`);
    }
  });

  socket.on("game:get-state", () => {
    try {
      const roomId = roomService.getUserRoom(socket.userId);
      if (!roomId) {
        socket.emit("error", { message: "You are not in a room" });
        return;
      }

      const game = gameService.getActiveGame(roomId);
      if (!game) {
        socket.emit("error", { message: "No active game" });
        return;
      }

      const isWordMaster = game.wordMaster === socket.userId;
      const revealWord = isWordMaster || game.status === "finished";

      socket.emit(
        "game:state",
        gameService.getGameStateForBroadcast(game, revealWord),
      );
    } catch (error) {
      logger.error(`Get state error: ${error.message}`);
      socket.emit("error", { message: error.message });
    }
  });
};
