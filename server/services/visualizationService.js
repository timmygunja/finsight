/**
 * Visualization Service
 * Handles generation and processing of visualizations
 */

const {
  extractVisualizationDataFromText,
  extractVisualizationBlocksFromText,
} = require("../utils/dataExtractors");
const {
  generateVisualizationData: aiGenerateVisualizationData,
} = require("./ai/aiVisualizationService");

/**
 * Generate visualization data
 * @param {Array} visualizationData - Array of visualization data objects
 * @param {Array} files - Array of file objects
 * @param {String} textPrompt - User's query or prompt
 * @returns {Promise<Array>} Array of enhanced visualization objects
 */
async function generateVisualizationData(
  visualizationData,
  files,
  textPrompt = ""
) {
  return await aiGenerateVisualizationData(
    visualizationData,
    files,
    textPrompt
  );
}

/**
 * Generate visualization code
 * @param {Array} data - Visualization data
 * @param {String} textPrompt - User's query or prompt
 * @returns {Promise<Object>} Visualization object with JSX code
 */
async function generateVisualizationCode(data, textPrompt) {
  const {
    generateVisualizationCode: aiGenerateVisualizationCode,
  } = require("./ai/aiVisualizationService");
  return await aiGenerateVisualizationCode(data, textPrompt);
}

/**
 * Extract visualizations from text
 * @param {String} text - Text to extract visualizations from
 * @returns {Promise<Array>} Array of visualization objects
 */
async function extractVisualizationsFromText(text) {
  try {
    console.log("Extracting visualization data from text");
    const extractedVisualizations = extractVisualizationDataFromText(text);

    if (extractedVisualizations && extractedVisualizations.length > 0) {
      console.log(
        `Extracted ${extractedVisualizations.length} visualizations from text`
      );

      // Generate JSX for each visualization
      const enhancedVisualizations = await Promise.all(
        extractedVisualizations.map(async (viz) => {
          try {
            // Try to generate JSX using AI
            const jsxViz = await generateVisualizationCode([viz], text);
            return {
              ...viz,
              type: "jsx",
              data: jsxViz.jsx,
              chartType: jsxViz.chartType || viz.type,
              originalBlock: viz.originalBlock,
              placeholder: viz.placeholder,
            };
          } catch (error) {
            console.error("Error generating JSX for visualization:", error);
            // Fall back to the original visualization data
            return viz;
          }
        })
      );

      return enhancedVisualizations;
    }

    return [];
  } catch (error) {
    console.error("Error extracting visualizations from text:", error);
    return [];
  }
}

module.exports = {
  generateVisualizationData,
  generateVisualizationCode,
  extractVisualizationsFromText,
};
