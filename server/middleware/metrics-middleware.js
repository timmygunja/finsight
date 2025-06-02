// ===== METRICS MIDDLEWARE - ENHANCED =====
const { metrics } = require("../lib/metrics");

function metricsMiddleware(req, res, next) {
  // Skip metrics collection for the metrics endpoint itself
  if (req.path === "/metrics") {
    return next();
  }

  const startTime = Date.now();
  const route = normalizeRoute(req.path);

  // Increment request counter
  metrics.httpRequestsTotal.inc({
    method: req.method,
    route: route,
    status_code: 0,
  });

  // Override res.end to capture response metrics
  const originalEnd = res.end;
  res.end = function (...args) {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds

    // Record final metrics
    metrics.httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode,
    });

    metrics.httpRequestDuration.observe(
      {
        method: req.method,
        route: route,
      },
      duration
    );

    // Track errors
    if (res.statusCode >= 400) {
      metrics.errorsTotal.inc({
        type: "http",
        code: res.statusCode.toString(),
      });
    }

    return originalEnd.apply(this, args);
  };

  next();
}

// ===== ROUTE NORMALIZATION - ENHANCED =====
function normalizeRoute(path) {
  return path
    .replace(/\/[0-9]+/g, "/:id")
    .replace(
      /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      "/:uuid"
    )
    .replace(/\/conv_[0-9]+/g, "/conv_:id")
    .replace(/\/api\/v\d+/g, "/api/v*");
}

module.exports = metricsMiddleware;
