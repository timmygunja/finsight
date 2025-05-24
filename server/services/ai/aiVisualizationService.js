/**
 * AI Visualization Service
 * Handles generation of visualizations using AI models
 */

const axios = require("axios");
const { parseJSX, fixJsxBalancing } = require("../../utils/jsxUtils");
const {
  generateChartComponentString,
  processChartData,
  validateChartData,
  determineChartType,
  generateSimpleVisualization,
} = require("../../utils/chartUtils");
const {
  extractVisualizationBlocks,
  parseVisualizationBlock,
  extractVisualizationDataFromText,
  extractVisualizationData,
  extractVisualizationBlocksFromText,
  extractDataFromText,
} = require("../../utils/dataExtractors");
const {
  VISUALIZATION_PROMPT_TEMPLATE,
  GENERIC_VISUALIZATION_PROMPT_TEMPLATE,
} = require("../../utils/promptTemplates");

/**
 * Main function to generate visualization data
 * First attempts to use OpenRouter AI for advanced visualization generation
 * Falls back to traditional methods if AI generation fails
 *
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
  try {
    // First attempt: Extract visualization blocks from text prompt
    const visualizationBlocks = extractVisualizationBlocks(textPrompt);
    if (visualizationBlocks && visualizationBlocks.length > 0) {
      console.log(
        `Found ${visualizationBlocks.length} visualization blocks in text prompt`
      );
      const blockVisualizations = [];

      for (const block of visualizationBlocks) {
        const vizData = parseVisualizationBlock(block.content);
        if (vizData) {
          // Add original block content for reference
          vizData.originalBlock = block.content;
          vizData.placeholder = `---VISUALIZATION_PLACEHOLDER_${blockVisualizations.length}---`;
          blockVisualizations.push(vizData);
        }
      }

      if (blockVisualizations.length > 0) {
        console.log(
          `Successfully extracted ${blockVisualizations.length} visualizations from blocks`
        );

        // Generate JSX for each visualization
        const enhancedVisualizations = await Promise.all(
          blockVisualizations.map(async (viz) => {
            try {
              // Try to generate JSX using AI
              const jsxViz = await generateVisualizationCode([viz], textPrompt);
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
    }

    // Second attempt: Use OpenRouter AI to generate visualizations
    const aiVisualizations = await generateAIVisualizations(files, textPrompt);

    if (aiVisualizations && aiVisualizations.length > 0) {
      console.log("Successfully generated AI visualizations");
      return aiVisualizations;
    }

    console.log(
      "AI visualization generation failed or returned no results, falling back to traditional methods"
    );

    // Third attempt: Use provided visualization data
    if (visualizationData && visualizationData.length > 0) {
      return visualizationData.map((vizData) => {
        // Ensure data is in the correct format
        return processChartData(vizData);
      });
    }

    // Fourth attempt: Auto-generate from files
    console.log("No visualization data provided, auto-generating from files");
    return autoGenerateVisualizations(files);
  } catch (error) {
    console.error("Error in visualization generation pipeline:", error);

    // Final fallback: Try to auto-generate from files
    try {
      return autoGenerateVisualizations(files);
    } catch (fallbackError) {
      console.error("Fallback visualization generation failed:", fallbackError);
      return []; // Return empty array if all methods fail
    }
  }
}

/**
 * Auto-generate visualizations from file data
 * @param {Array} files - Array of file objects
 * @returns {Promise<Array>} Array of visualization objects
 */
async function autoGenerateVisualizations(files) {
  const visualizations = [];

  if (!files || files.length === 0) {
    return visualizations;
  }

  // Implementation of auto-generation logic
  // This is a simplified version - you can expand it as needed

  return visualizations;
}

/**
 * Generate AI visualizations from files and text prompt
 * @param {Array} files - Array of file objects
 * @param {String} textPrompt - User's query or prompt
 * @returns {Promise<Array>} Array of visualization objects
 */
async function generateAIVisualizations(files, textPrompt) {
  try {
    console.log(
      "Starting AI visualization generation with prompt:",
      textPrompt
    );

    // First try to extract visualization blocks
    const blocks = await extractVisualizationBlocksFromText(textPrompt);
    if (blocks.length > 0) {
      console.log(`Found ${blocks.length} visualization blocks`);

      const visualizations = [];
      for (const block of blocks) {
        try {
          const viz = await generateVisualizationCode([block], textPrompt);
          visualizations.push({
            type: "jsx",
            title: viz.title,
            description: viz.description,
            data: viz.jsx,
            chartType: viz.chartType,
            originalBlock: block.originalBlock,
            placeholder: `---VISUALIZATION_PLACEHOLDER_${visualizations.length}---`,
          });
        } catch (blockError) {
          console.error("Error processing block:", blockError);
        }
      }

      if (visualizations.length > 0) {
        console.log(
          `Generated ${visualizations.length} visualizations from blocks`
        );
        return visualizations;
      }
    }

    // Second, try to extract visualizations from the text
    if (textPrompt) {
      const extractedVisualizations =
        extractVisualizationDataFromText(textPrompt);
      if (extractedVisualizations && extractedVisualizations.length > 0) {
        console.log(
          `Extracted ${extractedVisualizations.length} visualizations from text`
        );

        // Generate JSX for each visualization
        const enhancedVisualizations = await Promise.all(
          extractedVisualizations.map(async (viz) => {
            try {
              // Try to generate JSX using AI
              const jsxViz = await generateVisualizationCode([viz], textPrompt);
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
    }

    if (!files || files.length === 0) {
      console.log("No files provided for AI visualization generation");
      return [];
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      console.log(
        "OpenRouter API key not configured, skipping AI visualization generation"
      );
      return [];
    }

    // Extract data from files for visualization
    const visualizationData = extractVisualizationData(files);
    console.log(
      "Extracted visualization data:",
      JSON.stringify(visualizationData).substring(0, 200) + "..."
    );

    if (!visualizationData || visualizationData.length === 0) {
      console.log("No suitable data found for AI visualization generation");
      return [];
    }

    try {
      console.log("Calling OpenRouter API for visualization generation...");
      const vizResponse = await generateVisualizationCode(
        visualizationData,
        textPrompt
      );
      console.log("Successfully received visualization from OpenRouter");

      // Return the visualization in the expected format
      return [
        {
          type: "jsx",
          title: vizResponse.title,
          description: vizResponse.description,
          data: vizResponse.jsx,
          chartType: vizResponse.chartType || "unknown",
        },
      ];
    } catch (vizError) {
      console.error(
        "Error generating visualization with OpenRouter:",
        vizError.message
      );

      // Fall back to generating a simple visualization based on the data
      console.log("Falling back to simple visualization generation");
      const simpleViz = generateSimpleVisualization(visualizationData);
      if (simpleViz) {
        return [simpleViz];
      }
      return [];
    }
  } catch (error) {
    console.error("Error generating AI visualizations:", error.message);
    if (error.response) {
      console.error(
        "API response error details:",
        error.response.status,
        error.response.statusText
      );
    }
    return []; // Return empty array on error
  }
}

/**
 * Generate visualization code using OpenRouter AI
 * @param {Array} data - Visualization data
 * @param {String} textPrompt - User's query or prompt
 * @returns {Promise<Object>} Visualization object with JSX code
 */
async function generateVisualizationCode(data, textPrompt) {
  let result;
  let originalData;
  let validationResult;
  let fixedJsx;
  let content;

  try {
    const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key is not configured");
    }

    // Check if we have visualization data with original blocks
    originalData = null;
    if (Array.isArray(data)) {
      // Find any item that has originalBlock property
      const itemWithOriginal = data.find((item) => item.originalBlock);
      if (itemWithOriginal) {
        originalData = itemWithOriginal;
      }
    }

    // Prepare the prompt with original data if available
    let promptContent = "";
    if (originalData) {
      promptContent = VISUALIZATION_PROMPT_TEMPLATE.replace(
        "{visualizationBlock}",
        originalData.originalBlock
      )
        .replace("{title}", originalData.title || "Financial Visualization")
        .replace(
          "{description}",
          originalData.description || "Visualization of financial data"
        )
        .replace("{chartType}", originalData.type || "bar");
    } else {
      // Use the standard prompt if no original data is available
      promptContent = GENERIC_VISUALIZATION_PROMPT_TEMPLATE.replace(
        "{userQuery}",
        textPrompt || ""
      ).replace("{data}", JSON.stringify(data, null, 2));
    }

    console.log("Sending request to OpenRouter API...");

    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: "deepseek/deepseek-v3-base:free",
        messages: [{ role: "user", content: promptContent }],
        temperature: 0.5, // Lower temperature for more consistent output
        max_tokens: 1500,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.BASE_URL || "http://localhost:3000",
          "X-Title": "Finsight Financial Analysis",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Received response from OpenRouter API");

    // Extract the content from the response
    content = response.data.choices[0].message.content;
    console.log("Raw content from OpenRouter:", content);

    // Enhanced JSON extraction
    try {
      // First try direct parsing
      result = JSON.parse(content);
      console.log("Successfully parsed JSON directly");
    } catch (parseError) {
      console.log("Direct JSON parsing failed, trying to extract JSON...");

      // Try to extract JSON from various formats
      const jsonMatch = content.match(/{[\s\S]*?}/);
      if (jsonMatch) {
        try {
          // Clean up potential JSON issues
          const jsonStr = jsonMatch[0]
            .replace(/(\w+)\s*:/g, '"$1":') // Add quotes to keys
            .replace(/:\s*'/g, ': "') // Replace single quotes with double
            .replace(/'\s*([,}])/g, '"$1') // Close single quotes with double
            .replace(/,\s*}/g, "}"); // Remove trailing commas

          result = JSON.parse(jsonStr);
          console.log("Successfully parsed extracted JSON");
        } catch (nestedError) {
          console.error("Failed to parse extracted JSON:", nestedError);

          // Try to manually extract the JSX code
          const jsxMatch = content.match(
            /<ResponsiveContainer[\s\S]*?<\/ResponsiveContainer>/s
          );
          if (jsxMatch) {
            console.log("Creating result object from JSX code");
            const jsxCode = jsxMatch[0].replace(/`/g, "");

            // Extract title and description if possible
            const titleMatch = content.match(/"title":\s*"([^"]+)"/);
            const descriptionMatch = content.match(
              /"description":\s*"([^"]+)"/
            );
            const chartTypeMatch = content.match(/"chartType":\s*"([^"]+)"/);

            result = {
              jsx: jsxCode,
              title: titleMatch
                ? titleMatch[1]
                : originalData?.title || "Financial Visualization",
              description: descriptionMatch
                ? descriptionMatch[1]
                : originalData?.description ||
                  "Visualization of financial data",
              chartType: chartTypeMatch
                ? chartTypeMatch[1]
                : originalData?.type || determineChartType(jsxCode),
            };
          } else {
            throw new Error("Could not extract JSX code from response");
          }
        }
      } else {
        // Try to extract JSX directly
        const jsxMatch = content.match(
          /<ResponsiveContainer[\s\S]*?<\/ResponsiveContainer>/s
        );
        if (jsxMatch) {
          console.log("Creating result object from JSX code");
          const jsxCode = jsxMatch[0].replace(/`/g, "");

          // Extract title and description if possible
          const titleMatch = content.match(/"title":\s*"([^"]+)"/);
          const descriptionMatch = content.match(/"description":\s*"([^"]+)"/);
          const chartTypeMatch = content.match(/"chartType":\s*"([^"]+)"/);

          result = {
            jsx: jsxCode,
            title: titleMatch
              ? titleMatch[1]
              : originalData?.title || "Financial Visualization",
            description: descriptionMatch
              ? descriptionMatch[1]
              : originalData?.description || "Visualization of financial data",
            chartType: chartTypeMatch
              ? chartTypeMatch[1]
              : originalData?.type || determineChartType(jsxCode),
          };
        } else {
          throw new Error("Could not extract JSX code from response");
        }
      }
    }

    // Validate the result structure
    if (!result.jsx) {
      throw new Error("AI response is missing JSX field");
    }

    // Clean up the JSX code - remove any backticks
    result.jsx = result.jsx.replace(/`/g, "");

    if (!result.title) {
      result.title = originalData?.title || "Financial Visualization";
    }

    if (!result.description) {
      result.description =
        originalData?.description || "Visualization of financial data";
    }

    if (!result.chartType) {
      result.chartType = originalData?.type || determineChartType(result.jsx);
    }

    // Validate the JSX code
    validationResult = parseJSX(result.jsx);
    if (!validationResult.isValid) {
      console.error("JSX validation failed:", validationResult.error);

      // Try to fix common JSX issues
      fixedJsx = fixJsxBalancing(result.jsx);
      const revalidation = parseJSX(fixedJsx);

      if (revalidation.isValid) {
        console.log("Successfully fixed JSX issues");
        result.jsx = fixedJsx;
      } else {
        throw new Error(`Invalid JSX generated: ${validationResult.error}`);
      }
    }

    // If we have original data, add it to the result
    if (originalData) {
      result.originalBlock = originalData.originalBlock;
      result.placeholder = originalData.placeholder;
    }

    return {
      jsx: result.jsx,
      title: result.title,
      description: result.description,
      chartType: result.chartType || "unknown",
      originalBlock: result.originalBlock,
      placeholder: result.placeholder,
    };
  } catch (error) {
    console.error("Error in generateVisualizationCode:", {
      error: error.message,
      responseContent: content?.substring(0, 200) + "...",
      stack: error.stack,
    });
    throw new Error(`Failed to generate visualization code: ${error.message}`);
  }
}

module.exports = {
  generateVisualizationData,
  autoGenerateVisualizations,
  generateAIVisualizations,
  generateVisualizationCode,
};
