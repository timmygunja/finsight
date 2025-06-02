// ===== CACHING SERVICE - NEW ADDITION =====
// High-level caching service that uses Redis
const redisClient = require("./redis-client");
const crypto = require("crypto");

class CacheService {
  constructor() {
    this.defaultTTL = {
      aiResponse: 3600, // 1 hour for AI responses
      visualization: 7200, // 2 hours for visualizations
      fileProcessing: 1800, // 30 minutes for file processing
      userSession: 86400, // 24 hours for user sessions
    };
  }

  // Generate cache key from request data
  generateCacheKey(prefix, data) {
    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(data))
      .digest("hex");
    return `${prefix}:${hash}`;
  }

  // Cache AI responses with smart key generation
  async cacheAIResponse(requestData, response) {
    const cacheKey = this.generateCacheKey("ai_response", {
      text: requestData.text,
      files: requestData.files?.map((f) => ({ name: f.name, type: f.type })),
      model: response.source,
    });

    await redisClient.cacheAIResponse(
      cacheKey,
      response,
      this.defaultTTL.aiResponse
    );
    return cacheKey;
  }

  // Get cached AI response
  async getCachedAIResponse(requestData) {
    const cacheKey = this.generateCacheKey("ai_response", {
      text: requestData.text,
      files: requestData.files?.map((f) => ({ name: f.name, type: f.type })),
    });

    return await redisClient.getCachedAIResponse(cacheKey);
  }

  // Cache visualization data
  async cacheVisualization(visualizationData) {
    const cacheKey = this.generateCacheKey("visualization", visualizationData);
    await redisClient.cacheVisualization(
      cacheKey,
      visualizationData,
      this.defaultTTL.visualization
    );
    return cacheKey;
  }

  // Invalidate cache patterns
  async invalidatePattern(pattern) {
    // Implementation depends on Redis version and setup
    console.log(`Invalidating cache pattern: ${pattern}`);
  }
}

module.exports = new CacheService();
