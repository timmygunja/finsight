/**
 * Machine Learning Service
 * Handles ML model interactions and data processing
 */

const { routeToAIService } = require("./ai/aiService");
const visualizationService = require("./visualizationService");
const {
  extractVisualizationBlocksFromText,
} = require("../utils/dataExtractors");

/**
 * Send data to ML service for processing
 * @param {Object} requestData - Request data
 * @returns {Promise<Object>} ML service response
 */
async function sendToMLService(requestData) {
  try {
    console.log("Sending data to ML service...");

    // Process the request with AI service
    const aiResponse = await routeToAIService(requestData);
    console.log("AI response received, generating visualizations...");

    // Try to extract visualization blocks from the AI response
    const visualizations = [];
    const processedText = aiResponse.text;

    try {
      const blocks = await extractVisualizationBlocksFromText(aiResponse.text);
      if (blocks && blocks.length > 0) {
        console.log(`Found ${blocks.length} visualization blocks`);

        // Process each block to generate visualizations
        for (const block of blocks) {
          try {
            const viz = await visualizationService.generateVisualizationCode(
              [block],
              requestData.text
            );
            visualizations.push({
              type: "jsx",
              title: viz.title || block.title,
              description: viz.description || block.description,
              data: viz.jsx,
              chartType: viz.chartType || block.type,
              originalBlock: block.originalBlock,
              placeholder: `---VISUALIZATION_PLACEHOLDER_${visualizations.length}---`,
            });
          } catch (blockError) {
            console.error("Error processing visualization block:", blockError);
            // Add a fallback visualization based on the original block
            if (block.data && block.data.length > 0) {
              visualizations.push({
                type: block.type || "bar",
                title: block.title || "Визуализация данных",
                description: block.description || "",
                data: block.data,
                xAxis: block.xAxis || "Категория",
                yAxis: block.yAxis || "Значение",
                originalBlock: block.originalBlock,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error("Error processing visualization blocks:", error);
    }

    // Important: Do NOT modify the original text - we want to keep the visualization blocks
    // Only replace blocks with placeholders if we successfully generated visualizations

    console.log(`ML service returning ${visualizations.length} visualizations`);

    return {
      text: aiResponse.text, // Return the original text with visualization blocks intact
      visualizations: visualizations,
      source: aiResponse.source,
    };

    // If no visualizations were extracted from blocks, try to extract from text
    /*if (visualizations.length === 0) {
      try {
        const extractedVisualizations = await visualizationService.extractVisualizationsFromText(aiResponse.text)
        if (extractedVisualizations && extractedVisualizations.length > 0) {
          console.log(`Extracted ${extractedVisualizations.length} visualizations from text`)
          visualizations = extractedVisualizations
        }
      } catch (error) {
        console.error("Error extracting visualizations from text:", error)
      }
    }

    // If still no visualizations, try to generate from files
    if (visualizations.length === 0 && requestData.files && requestData.files.length > 0) {
      try {
        console.log("Generating visualizations from files...")
        const generatedVisualizations = await visualizationService.generateVisualizationData(
          [],
          requestData.files,
          requestData.text,
        )
        if (generatedVisualizations && generatedVisualizations.length > 0) {
          console.log(`Generated ${generatedVisualizations.length} visualizations from files`)
          visualizations = generatedVisualizations
        }
      } catch (error) {
        console.error("Error generating visualizations from files:", error)
      }
    }

    console.log(`ML service returned ${visualizations.length} visualizations`)

    return {
      text: aiResponse.text,
      visualizations: visualizations,
      source: aiResponse.source,
    }*/
  } catch (error) {
    console.error("Error in ML service:", error);
    return {
      text: "Я проанализировал ваши данные, но в процессе обработки на сервере возникла ошибка. Пожалуйста, попробуйте еще раз или обратитесь в техническую поддержку.",
      visualizations: [],
      source: "error",
    };
  }
}

module.exports = {
  sendToMLService,
};
