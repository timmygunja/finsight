// ===== PROMETHEUS METRICS - ENHANCED =====
const promClient = require("prom-client");

// Create a Registry which registers the metrics
const register = new promClient.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: "finsight-analytics",
});

// Enable the collection of default metrics
promClient.collectDefaultMetrics({ register });

// ===== CUSTOM METRICS DEFINITIONS =====
const metrics = {
  // ===== HTTP METRICS =====
  httpRequestsTotal: new promClient.Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests",
    labelNames: ["method", "route", "status_code"],
    registers: [register],
  }),

  httpRequestDuration: new promClient.Histogram({
    name: "http_request_duration_seconds",
    help: "HTTP request duration in seconds",
    labelNames: ["method", "route"],
    buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10],
    registers: [register],
  }),

  // ===== AI SERVICE METRICS =====
  aiServiceRequests: new promClient.Counter({
    name: "ai_service_requests_total",
    help: "Total number of AI service requests",
    labelNames: ["service", "status"],
    registers: [register],
  }),

  aiServiceDuration: new promClient.Histogram({
    name: "ai_service_duration_seconds",
    help: "AI service request duration in seconds",
    labelNames: ["service"],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    registers: [register],
  }),

  // ===== CACHE METRICS - NEW =====
  cacheHits: new promClient.Counter({
    name: "cache_hits_total",
    help: "Total number of cache hits",
    labelNames: ["type"],
    registers: [register],
  }),

  cacheMisses: new promClient.Counter({
    name: "cache_misses_total",
    help: "Total number of cache misses",
    labelNames: ["type"],
    registers: [register],
  }),

  cacheOperationDuration: new promClient.Histogram({
    name: "cache_operation_duration_seconds",
    help: "Cache operation duration in seconds",
    labelNames: ["operation", "type"],
    buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    registers: [register],
  }),

  // ===== DATABASE METRICS =====
  dbOperations: new promClient.Counter({
    name: "db_operations_total",
    help: "Total number of database operations",
    labelNames: ["operation", "collection", "status"],
    registers: [register],
  }),

  dbOperationDuration: new promClient.Histogram({
    name: "db_operation_duration_seconds",
    help: "Database operation duration in seconds",
    labelNames: ["operation", "collection"],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [register],
  }),

  // ===== APPLICATION METRICS =====
  activeUsers: new promClient.Gauge({
    name: "active_users",
    help: "Number of active users",
    registers: [register],
  }),

  activeConversations: new promClient.Gauge({
    name: "active_conversations",
    help: "Number of active conversations",
    registers: [register],
  }),

  visualizationsGenerated: new promClient.Counter({
    name: "visualizations_generated_total",
    help: "Total number of visualizations generated",
    labelNames: ["type", "status"],
    registers: [register],
  }),

  fileProcessingDuration: new promClient.Histogram({
    name: "file_processing_duration_seconds",
    help: "File processing duration in seconds",
    labelNames: ["file_type"],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register],
  }),

  // ===== SYSTEM METRICS =====
  memoryUsage: new promClient.Gauge({
    name: "memory_usage_bytes",
    help: "Memory usage in bytes",
    labelNames: ["type"],
    registers: [register],
  }),

  // ===== ERROR METRICS =====
  errorsTotal: new promClient.Counter({
    name: "errors_total",
    help: "Total number of errors",
    labelNames: ["type", "code"],
    registers: [register],
  }),

  // ===== REDIS METRICS - NEW =====
  redisConnections: new promClient.Gauge({
    name: "redis_connections",
    help: "Number of Redis connections",
    registers: [register],
  }),

  redisOperations: new promClient.Counter({
    name: "redis_operations_total",
    help: "Total number of Redis operations",
    labelNames: ["operation", "status"],
    registers: [register],
  }),
};

// ===== MEMORY USAGE TRACKING - ENHANCED =====
setInterval(() => {
  const memUsage = process.memoryUsage();
  metrics.memoryUsage.set({ type: "heap_used" }, memUsage.heapUsed);
  metrics.memoryUsage.set({ type: "heap_total" }, memUsage.heapTotal);
  metrics.memoryUsage.set({ type: "external" }, memUsage.external);
  metrics.memoryUsage.set({ type: "rss" }, memUsage.rss);
}, 30000);

module.exports = { metrics, register };
