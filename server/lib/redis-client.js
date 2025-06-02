// ===== REDIS INTEGRATION - NEW ADDITION =====
// Redis client configuration and connection management
const redis = require("redis");

class RedisClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      // Redis connection configuration
      this.client = redis.createClient({
        url: process.env.REDIS_URL || "redis://localhost:6379",
        retry_strategy: (options) => {
          if (options.error && options.error.code === "ECONNREFUSED") {
            console.error("Redis server connection refused");
            return new Error("Redis server connection refused");
          }
          if (options.total_retry_time > 1000 * 60 * 60) {
            console.error("Redis retry time exhausted");
            return new Error("Retry time exhausted");
          }
          if (options.attempt > 10) {
            console.error("Redis max retry attempts reached");
            return undefined;
          }
          // Reconnect after
          return Math.min(options.attempt * 100, 3000);
        },
      });

      this.client.on("error", (err) => {
        console.error("Redis Client Error:", err);
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        console.log("Redis Client Connected");
        this.isConnected = true;
      });

      this.client.on("ready", () => {
        console.log("Redis Client Ready");
        this.isConnected = true;
      });

      this.client.on("end", () => {
        console.log("Redis Client Disconnected");
        this.isConnected = false;
      });

      await this.client.connect();
      return this.client;
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      this.isConnected = false;
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  // Cache AI responses to reduce API calls
  async cacheAIResponse(key, response, ttl = 3600) {
    if (!this.isConnected) return false;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(response));
      return true;
    } catch (error) {
      console.error("Error caching AI response:", error);
      return false;
    }
  }

  // Retrieve cached AI responses
  async getCachedAIResponse(key) {
    if (!this.isConnected) return null;

    try {
      const cached = await this.client.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error("Error retrieving cached AI response:", error);
      return null;
    }
  }

  // Cache visualization data
  async cacheVisualization(key, data, ttl = 7200) {
    if (!this.isConnected) return false;

    try {
      await this.client.setEx(key, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error("Error caching visualization:", error);
      return false;
    }
  }

  // Session management
  async setSession(sessionId, data, ttl = 86400) {
    if (!this.isConnected) return false;

    try {
      await this.client.setEx(
        `session:${sessionId}`,
        ttl,
        JSON.stringify(data)
      );
      return true;
    } catch (error) {
      console.error("Error setting session:", error);
      return false;
    }
  }

  async getSession(sessionId) {
    if (!this.isConnected) return null;

    try {
      const session = await this.client.get(`session:${sessionId}`);
      return session ? JSON.parse(session) : null;
    } catch (error) {
      console.error("Error getting session:", error);
      return null;
    }
  }

  // Rate limiting
  async checkRateLimit(key, limit, window) {
    if (!this.isConnected) return { allowed: true, remaining: limit };

    try {
      const current = await this.client.incr(key);
      if (current === 1) {
        await this.client.expire(key, window);
      }

      const remaining = Math.max(0, limit - current);
      return {
        allowed: current <= limit,
        remaining,
        current,
      };
    } catch (error) {
      console.error("Error checking rate limit:", error);
      return { allowed: true, remaining: limit };
    }
  }
}

// Export singleton instance
const redisClient = new RedisClient();
module.exports = redisClient;
