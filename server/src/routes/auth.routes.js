const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const db = require("../db/database");
const authenticate = require("../middleware/auth");
const { jwtSecret } = require("../config/env");

const router = express.Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  const user = db
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email);

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password",
    });
  }

  const token = jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
    },
    jwtSecret,
    {
      expiresIn: "1d",
    }
  );

  res.cookie("auth_token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});

router.get("/me", authenticate, (req, res) => {
  const user = db
    .prepare("SELECT id, name, email FROM users WHERE id = ?")
    .get(req.user.id);

  if (!user) {
    return res.status(401).json({
      success: false,
      message: "User not found",
    });
  }

  res.json({
    success: true,
    user,
  });
});

router.post("/logout", (req, res) => {
  res.clearCookie("auth_token");

  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

module.exports = router;