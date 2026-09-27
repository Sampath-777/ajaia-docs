const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");

const initializeDatabase = require("./db/schema");
const { port } = require("./config/env");

const authRoutes = require("./routes/auth.routes");
const documentsRoutes = require("./routes/documents.routes");

initializeDatabase();

const app = express();

if (process.env.NODE_ENV !== "production") {
  app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "http://192.168.31.67:5173",
      ],
      credentials: true,
    })
  );
}

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/documents", documentsRoutes);

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Ajaia Docs API is running",
  });
});

const clientBuildPath = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientBuildPath));
app.get(/.*/, (req, res, next) => {
  if (req.path.startsWith("/api/")) {
    return next();
  }

  res.sendFile(path.join(clientBuildPath, "index.html"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}`);
});
