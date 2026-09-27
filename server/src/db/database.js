const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { dbPath } = require("../config/env");

const dbDirectory = path.dirname(dbPath);

if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

const db = new Database(dbPath);

db.pragma("foreign_keys = ON");

module.exports = db;