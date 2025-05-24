/**
 * Process JSON files and extract data
 * @param {Buffer} buffer - File buffer
 * @returns {Object} Processed data
 */
async function processJsonFile(buffer) {
  try {
    // Parse JSON from buffer
    const jsonString = buffer.toString("utf8");
    const jsonData = JSON.parse(jsonString);

    // Analyze JSON structure
    const analysis = analyzeJsonStructure(jsonData);

    return {
      data: jsonData,
      analysis,
    };
  } catch (error) {
    console.error("Error processing JSON file:", error);
    throw new Error("Failed to process JSON file");
  }
}

/**
 * Analyze the structure of a JSON object
 * @param {Object|Array} json - JSON data
 * @returns {Object} Analysis results
 */
function analyzeJsonStructure(json) {
  const analysis = {
    type: Array.isArray(json) ? "array" : typeof json,
    keys: [],
    nestedStructures: {},
    depth: 0,
    size: 0,
  };

  if (typeof json !== "object" || json === null) {
    return {
      type: typeof json,
      value: json,
      depth: 0,
      size: 1,
    };
  }

  if (Array.isArray(json)) {
    analysis.length = json.length;

    // Analyze array items (sample first 10)
    const sampleSize = Math.min(json.length, 10);
    if (sampleSize > 0) {
      const sampleItem = json[0];
      if (typeof sampleItem === "object" && sampleItem !== null) {
        analysis.itemStructure = analyzeJsonStructure(sampleItem);
        analysis.depth = 1 + analysis.itemStructure.depth;
      } else {
        analysis.itemType = typeof sampleItem;
        analysis.depth = 1;
      }
    }

    analysis.size = json.length;
  } else {
    // Object analysis
    analysis.keys = Object.keys(json);
    analysis.keyCount = analysis.keys.length;

    // Analyze nested structures
    let maxDepth = 0;
    let totalSize = 1; // Count the object itself

    for (const key of analysis.keys) {
      const value = json[key];
      if (typeof value === "object" && value !== null) {
        const nestedAnalysis = analyzeJsonStructure(value);
        analysis.nestedStructures[key] = {
          type: nestedAnalysis.type,
          depth: nestedAnalysis.depth,
        };
        maxDepth = Math.max(maxDepth, nestedAnalysis.depth);
        totalSize += nestedAnalysis.size;
      } else {
        analysis.nestedStructures[key] = {
          type: typeof value,
          depth: 0,
        };
        totalSize += 1;
      }
    }

    analysis.depth = 1 + maxDepth;
    analysis.size = totalSize;
  }

  return analysis;
}

module.exports = { processJsonFile };
