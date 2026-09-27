const bcrypt = require("bcryptjs");
const db = require("./database");
const initializeDatabase = require("./schema");

initializeDatabase();

const users = [
  {
    name: "Alice",
    email: "alice@example.com",
    password: "password123",
  },
  {
    name: "Bob",
    email: "bob@example.com",
    password: "password123",
  },
];

const insertUser = db.prepare(`
  INSERT OR IGNORE INTO users (name, email, password_hash)
  VALUES (?, ?, ?)
`);

for (const user of users) {
  const passwordHash = bcrypt.hashSync(user.password, 10);

  insertUser.run(
    user.name,
    user.email,
    passwordHash
  );
}

console.log("Seed users created successfully.");