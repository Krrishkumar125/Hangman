const axios = require("axios");
const logger = require("../utils/logger");
const config = require("../config/server.config");

class WordService {
  constructor() {
    this.fallbackWords = [
      "FAMILY",
      "FRIEND",
      "MARKET",
      "WINDOW",
      "FLOWER",
      "SCHOOL",
      "STREET",
      "ANIMAL",
      "TRAVEL",
      "MUSIC",
      "LANGUAGE",
      "HOSPITAL",
      "ADVENTURE",
      "IMPORTANT",
      "BEAUTIFUL",
      "DANGEROUS",
      "DIFFERENT",
      "SITUATION",
    ];
  }

  async getRandomWord() {
    try {
      const response = await axios.get(`${config.randomWordApiUrl}?length=8`);
      const word = response.data[0].toUpperCase();

      const isValid = await this.validateWord(word);
      if (isValid) return word;

      return this.getFallbackWord();
    } catch (error) {
      logger.warn("Random word API failed, using fallback");
      return this.getFallbackWord();
    }
  }

  async validateWord(word) {
    try {
      const url = `${config.dictionaryApiUrl}/${word.toLowerCase()}`;
      const response = await axios.get(url);
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }

  getFallbackWord() {
    return this.fallbackWords[
      Math.floor(Math.random() * this.fallbackWords.length)
    ];
  }
}

module.exports = new WordService();
