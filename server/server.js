const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const { analyzeData } = require("./controllers/analyzeController");
const conversationRoutes = require("./routes/conversation");
const multer = require("multer");

// Загрузка переменных окружения
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Подключение к MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

mongoose
  .connect(MONGODB_URI, {
    dbName: MONGODB_DB,
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Routes
app.use("/api", apiRoutes);
app.use("/auth", authRoutes);
app.post("/api/analyze", upload.array("files"), analyzeData);
app.use("/api/conversations", conversationRoutes);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/build", "index.html"));
  });
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Base URL: ${process.env.BASE_URL}`);
});

module.exports = app;
