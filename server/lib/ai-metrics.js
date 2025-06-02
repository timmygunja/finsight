/**
 * Metrics tracking for AI services
 */
const { metrics } = require("./metrics")

/**
 * Higher-order function to track AI service calls with metrics
 * @param {string} serviceName - Name of the AI service
 * @param {Function} serviceFunction - The AI service function to track
 * @returns {Function} - Wrapped function with metrics
 */
function trackAIServiceCall(serviceName, serviceFunction) {
  return async (...args) => {
    const startTime = Date.now()

    try {
      // Call the original service function
      const result = await serviceFunction(...args)

      // Record successful request
      metrics.aiServiceRequestsTotal.inc({
        service: serviceName,
        status: "success",
      })

      // Record latency
      const duration = Date.now() - startTime
      metrics.aiServiceLatencyMs.observe({ service: serviceName }, duration)

      return result
    } catch (error) {
      // Record failed request
      metrics.aiServiceRequestsTotal.inc({
        service: serviceName,
        status: "error",
      })

      // Record error
      metrics.errorsTotal.inc({
        type: "ai_service",
        code: error.code || "unknown",
      })

      // Re-throw the error
      throw error
    }
  }
}

module.exports = {
  trackAIServiceCall,
}
