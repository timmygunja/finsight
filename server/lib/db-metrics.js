import mongoose from "mongoose"
import { metrics } from "./metrics"

// Wrap MongoDB operations with metrics
export function wrapMongooseWithMetrics() {
  // Store original methods
  const originalExecute = mongoose.Query.prototype.exec
  const originalSave = mongoose.Model.prototype.save

  // Wrap exec method to track query performance
  mongoose.Query.prototype.exec = function (...args) {
    const startTime = Date.now()
    const collection = this.model.collection.name
    const operation = this.op

    // Track operation count
    metrics.dbOperationsTotal.inc({
      operation,
      collection,
      status: "pending",
    })

    return originalExecute
      .apply(this, args)
      .then((result) => {
        // Calculate duration
        const duration = Date.now() - startTime

        // Record successful operation
        metrics.dbOperationsTotal.inc({
          operation,
          collection,
          status: "success",
        })

        metrics.dbOperationLatencyMs.observe(
          {
            operation,
            collection,
          },
          duration,
        )

        return result
      })
      .catch((err) => {
        // Record failed operation
        metrics.dbOperationsTotal.inc({
          operation,
          collection,
          status: "error",
        })

        metrics.errorsTotal.inc({
          type: "database",
          code: err.code || "unknown",
        })

        throw err
      })
  }

  // Wrap save method to track document saves
  mongoose.Model.prototype.save = function (...args) {
    const startTime = Date.now()
    const collection = this.constructor.collection.name
    const operation = this.isNew ? "insert" : "update"

    // Track operation count
    metrics.dbOperationsTotal.inc({
      operation,
      collection,
      status: "pending",
    })

    return originalSave
      .apply(this, args)
      .then((result) => {
        // Calculate duration
        const duration = Date.now() - startTime

        // Record successful operation
        metrics.dbOperationsTotal.inc({
          operation,
          collection,
          status: "success",
        })

        metrics.dbOperationLatencyMs.observe(
          {
            operation,
            collection,
          },
          duration,
        )

        return result
      })
      .catch((err) => {
        // Record failed operation
        metrics.dbOperationsTotal.inc({
          operation,
          collection,
          status: "error",
        })

        metrics.errorsTotal.inc({
          type: "database",
          code: err.code || "unknown",
        })

        throw err
      })
  }
}
