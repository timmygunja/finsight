// ===== CACHE MIDDLEWARE - NEW ADDITION =====
// Express middleware for caching responses
const cacheService = require("../lib/cache-service");
const { metrics } = require("../lib/metrics");
const redisClient = require("../lib/redis-client"); // Import redisClient

function cacheMiddleware(options = {}) {
  const { ttl = 3600, keyGenerator = null, skipCache = () => false } = options;

  return async (req, res, next) => {
    // Skip caching for certain conditions
    if (skipCache(req) || req.method !== "GET") {
      return next();
    }

    // Generate cache key
    const cacheKey = keyGenerator
      ? keyGenerator(req)
      : `route:${req.originalUrl}`;

    try {
      // Try to get cached response
      const cached = await redisClient.getCachedAIResponse(cacheKey);

      if (cached) {
        // Cache hit - increment metrics
        metrics.cacheHits.inc({ type: "route" });

        res.set("X-Cache", "HIT");
        return res.json(cached);
      }

      // Cache miss - increment metrics
      metrics.cacheMisses.inc({ type: "route" });

      // Store original res.json
      const originalJson = res.json;

      // Override res.json to cache the response
      res.json = function (data) {
        // Cache the response
        redisClient
          .cacheAIResponse(cacheKey, data, ttl)
          .catch((err) => console.error("Cache write error:", err));

        res.set("X-Cache", "MISS");
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error("Cache middleware error:", error);
      metrics.errorsTotal.inc({ type: "cache", code: "middleware_error" });
      next();
    }
  };
}

module.exports = cacheMiddleware;
