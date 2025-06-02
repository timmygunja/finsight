const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
// New enhancements
const { register } = require("./lib/metrics");
const redisClient = require("./lib/redis-client");
const metricsMiddleware = require("./middleware/metrics-middleware");
const cacheMiddleware = require("./middleware/cache-middleware");

// Routes
const apiRoutes = require("./routes/api");
const authRoutes = require("./routes/auth");
const { analyzeData } = require("./controllers/analyzeController");
const conversationRoutes = require("./routes/conversation");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB;

mongoose
  .connect(MONGODB_URI, {
    dbName: MONGODB_DB,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    heartbeatFrequencyMS: 10000,
    retryWrites: true,
    w: "majority",
    maxPoolSize: 10,
  })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Redis connection
async function initializeRedis() {
  try {
    await redisClient.connect();
    console.log("✅ Redis connected successfully");
  } catch (error) {
    console.error("❌ Redis connection failed:", error);
    // Continue without Redis if connection fails
  }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(metricsMiddleware); // Prometheus metrics middleware

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// Routes
app.use("/api", apiRoutes);
app.use("/auth", authRoutes);
app.post(
  "/api/analyze",
  upload.array("files"),
  cacheMiddleware({
    ttl: 3600, // 1 hour cache
    keyGenerator: (req) => `analyze:${JSON.stringify(req.body)}`,
    skipCache: (req) => req.body.skipCache === true,
  }),
  analyzeData
);
app.use("/api/conversations", conversationRoutes);

// Metrics endpoint
app.get("/metrics", async (req, res) => {
  try {
    res.set("Content-Type", register.contentType);
    const metrics = await register.metrics();
    res.end(metrics);
  } catch (err) {
    console.error("Error generating metrics:", err);
    res.status(500).end(err.toString());
  }
});

// Health check endpoint
app.get("/health", async (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  const redisStatus = redisClient.isConnected ? "connected" : "disconnected";

  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: dbStatus,
      redis: redisStatus,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + " MB",
        total:
          Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + " MB",
      },
    },
  };

  if (dbStatus === "disconnected") {
    health.status = "unhealthy";
    res.status(503);
  } else if (redisStatus === "disconnected") {
    health.status = "degraded";
    res.status(200);
  }

  res.json(health);
});

// Redis status endpoint
app.get("/redis-status", (req, res) => {
  res.json({
    connected: redisClient.isConnected,
    status: redisClient.isConnected ? "connected" : "disconnected",
  });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/build", "index.html"));
  });
}

// Graceful shutdown
process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);

async function gracefulShutdown() {
  console.log("🔄 Received shutdown signal, closing connections...");

  server.close(async () => {
    console.log("✅ HTTP server closed");

    try {
      await redisClient.disconnect();
      console.log("✅ Redis connection closed");
    } catch (error) {
      console.error("❌ Error closing Redis:", error);
    }

    mongoose.connection.close(false, () => {
      console.log("✅ MongoDB connection closed");
      process.exit(0);
    });

    setTimeout(() => {
      console.error(
        "❌ Could not close connections in time, forcefully shutting down"
      );
      process.exit(1);
    }, 10000);
  });
}

// Start server
const server = app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(
    `Base URL: ${process.env.BASE_URL || "http://localhost:" + PORT}`
  );

  await initializeRedis();
  console.log("📊 Metrics available at http://localhost:" + PORT + "/metrics");
  console.log(
    "🏥 Health check available at http://localhost:" + PORT + "/health"
  );
});

module.exports = app;
