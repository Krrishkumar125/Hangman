const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");
const config = require("../config/server.config");
const wordService = require("./word.service");
const roomService = require("./room.service");
const Game = require("../models/Game");

class GameService {
  async startGame(roomId) {
    const room = roomService.getRoom(roomId);
    if (!room) throw new Error("Room not found");

    if (room.players.length < 2) {
      throw new Error("Need at least 2 players to start game");
    }

    if (room.currentGame && room.currentGame.status === "in-progress") {
      throw new Error("Game already in progress");
    }

    const word = await wordService.getRandomWord();

    const wordMasterIndex = room.currentGame
      ? (room.currentGame.wordMasterIndex + 1) % room.players.length
      : 0;

    const wordMaster = room.players[wordMasterIndex];

    const firstGuesserIndex = (wordMasterIndex + 1) % room.players.length;
    const firstGuesser = room.players[firstGuesserIndex];

    room.currentGame = {
      gameId: uuidv4(),
      status: "in-progress",
      word: word.toUpperCase(),
      wordMaster: wordMaster.id,
      wordMasterIndex,
      guessedLetters: [],
      incorrectGuesses: [],
      currentTurnPlayer: firstGuesser.id,
      currentTurnIndex: firstGuesserIndex,
      maxIncorrectGuesses: config.maxIncorrectGuesses,
      startedAt: Date.now(),
      endedAt: null,
      winner: null,
      scores: room.currentGame?.scores || {},
    };

    room.players.forEach((player) => {
      if (!room.currentGame.scores[player.id]) {
        room.currentGame.scores[player.id] = 0;
      }
    });

    logger.info(
      `Game started in room ${roomId}, word master: ${wordMaster.username}`,
    );

    return this.getGameStateForBroadcast(room.currentGame);
  }

  makeGuess(roomId, userId, letter) {
    const room = roomService.getRoom(roomId);
    if (!room || !room.currentGame) throw new Error("No active game");

    const game = room.currentGame;

    if (game.status !== "in-progress") {
      throw new Error("Game is not in progress");
    }

    if (game.currentTurnPlayer !== userId) {
      throw new Error("Not your turn");
    }

    if (game.wordMaster === userId) {
      throw new Error("Word master cannot guess");
    }

    const normalizedLetter = letter.toUpperCase().trim();
    if (!/^[A-Z]$/.test(normalizedLetter)) {
      throw new Error("Invalid letter. Must be a single A-Z character.");
    }

    if (
      game.guessedLetters.includes(normalizedLetter) ||
      game.incorrectGuesses.includes(normalizedLetter)
    ) {
      throw new Error("Letter already guessed");
    }

    const isCorrect = game.word.includes(normalizedLetter);

    if (isCorrect) {
      game.guessedLetters.push(normalizedLetter);
    } else {
      game.incorrectGuesses.push(normalizedLetter);
    }

    const isWordComplete = this.isWordGuessed(game.word, game.guessedLetters);
    if (isWordComplete) {
      return this.endGame(roomId, userId, "guessed");
    }

    if (game.incorrectGuesses.length >= game.maxIncorrectGuesses) {
      return this.endGame(roomId, null, "failed");
    }
    this.advanceTurn(room);

    return {
      isCorrect,
      letter: normalizedLetter,
      gameState: this.getGameStateForBroadcast(game),
      currentPlayer: room.players.find((p) => p.id === game.currentTurnPlayer)
        ?.username,
    };
  }

  advanceTurn(room) {
    const game = room.currentGame;
    let nextIndex = (game.currentTurnIndex + 1) % room.players.length;

    if (nextIndex === game.wordMasterIndex) {
      nextIndex = (nextIndex + 1) % room.players.length;
    }

    game.currentTurnIndex = nextIndex;
    game.currentTurnPlayer = room.players[nextIndex].id;
  }

  isWordGuessed(word, guessedLetters) {
    return word.split("").every((letter) => guessedLetters.includes(letter));
  }

  async endGame(roomId, winnerId, reason) {
    const room = roomService.getRoom(roomId);
    const game = room.currentGame;

    game.status = "finished";
    game.endedAt = Date.now();
    game.winner = winnerId;

    if (winnerId) {
      const remainingGuesses =
        game.maxIncorrectGuesses - game.incorrectGuesses.length;
      const points = 10 + remainingGuesses * 2;
      game.scores[winnerId] = (game.scores[winnerId] || 0) + points;
    }

    logger.info(
      `Game ended in room ${roomId}, reason: ${reason}, winner: ${winnerId || "none"}`,
    );

    await Game.create({
      roomId,
      word: game.word,
      wordMaster: game.wordMaster,
      winner: winnerId,
      players: room.players.map((p) => p.id),
      scores: game.scores,
      totalGuesses: game.guessedLetters.length + game.incorrectGuesses.length,
      incorrectGuesses: game.incorrectGuesses,
      duration: game.endedAt - game.startedAt,
    });

    await this.updateUserStats(room.players, winnerId);

    return {
      reason,
      winner: winnerId
        ? room.players.find((p) => p.id === winnerId)?.username
        : null,
      word: game.word,
      scores: game.scores,
      gameState: this.getGameStateForBroadcast(game, true),
    };
  }

  async updateUserStats(players, winnerId) {
    const User = require("../models/User");

    for (const player of players) {
      const update = { $inc: { gamesPlayed: 1 } };
      if (player.id === winnerId) {
        update.$inc.gamesWon = 1;
      }
      await User.findByIdAndUpdate(player.id, update);
    }
  }

  getGameStateForBroadcast(game, revealWord = false) {
    return {
      gameId: game.gameId,
      status: game.status,
      hiddenWord: revealWord
        ? game.word
        : this.getHiddenWord(game.word, game.guessedLetters),
      guessedLetters: game.guessedLetters,
      incorrectGuesses: game.incorrectGuesses,
      incorrectGuessesRemaining:
        game.maxIncorrectGuesses - game.incorrectGuesses.length,
      currentTurn: game.currentTurnPlayer,
      wordMaster: game.wordMaster,
      scores: game.scores,
    };
  }

  getHiddenWord(word, guessedLetters) {
    return word
      .split("")
      .map((letter) => (guessedLetters.includes(letter) ? letter : "_"))
      .join(" ");
  }

  getActiveGame(roomId) {
    const room = roomService.getRoom(roomId);
    return room?.currentGame || null;
  }
}

module.exports = new GameService();
