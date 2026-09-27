const path = require("path");
require("dotenv").config();

const config = {
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET || "development-secret-change-me",
  openaiApiKey: process.env.OPENAI_API_KEY,
  openaiModel: process.env.OPENAI_MODEL || "gpt-5-mini",
  dbPath:
    process.env.DB_PATH ||
    path.join(__dirname, "../../data/ajaia-docs.db"),
};

module.exports = config;
