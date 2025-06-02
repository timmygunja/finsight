import rateLimit from "express-rate-limit";
import RedisStore from "rate-limit-redis";
import Redis from "ioredis";
import { metrics } from "./metrics";

// Create Redis client
let redisClient;

try {
  redisClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  console.log("Redis client connected successfully");
} catch (error) {
  console.error("Redis connection error:", error);
  // Continue without Redis - will use memory store as fallback
}

// Create rate limiter middleware
export const apiLimiter = rateLimit({
  store: redisClient
    ? new RedisStore({
        // @ts-ignore - Type definitions might be outdated
        sendCommand: (...args) => redisClient.call(...args),
      })
    : undefined, // Falls back to memory store
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    // Track rate limit hits
    metrics.errorsTotal.inc({
      type: "rate_limit",
      code: "429",
    });

    res.status(options.statusCode).json({
      error: "Too many requests, please try again later.",
      retryAfter: Math.ceil(options.windowMs / 1000 / 60), // in minutes
    });
  },
});

// More restrictive limiter for AI endpoints
export const aiLimiter = rateLimit({
  store: redisClient
    ? new RedisStore({
        // @ts-ignore
        sendCommand: (...args) => redisClient.call(...args),
      })
    : undefined,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // Limit each IP to 50 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    metrics.errorsTotal.inc({
      type: "rate_limit",
      code: "429_ai",
    });

    res.status(options.statusCode).json({
      error: "AI request limit reached, please try again later.",
      retryAfter: Math.ceil(options.windowMs / 1000 / 60), // in minutes
    });
  },
});
