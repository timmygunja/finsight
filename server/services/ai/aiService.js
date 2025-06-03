const axios = require("axios");
const {
  SYSTEM_MESSAGE,
  ANALYSIS_PROMPT_TEMPLATE,
} = require("../../utils/promptTemplates");
const visualizationService = require("../visualizationService");
const {
  extractVisualizationDataFromText,
} = require("../../utils/dataExtractors");
// Monitoring and caching enhancements
const cacheService = require("../../lib/cache-service");
const { metrics } = require("../../lib/metrics");

/**
 * Main AI service that handles all AI model interactions with fallbacks
 * Now includes caching and metrics tracking
 * @param {Object} requestData - Request data including text, files, history, conversationId, userId
 * @returns {Promise<Object>} AI response with text, source, visualizationData, and context
 */
async function processWithAI(requestData) {
  const startTime = Date.now();

  try {
    // Check cache first
    const cachedResponse = await cacheService.getCachedAIResponse(requestData);
    if (cachedResponse) {
      metrics.cacheHits.inc({ type: "ai_response" });
      console.log("Cache hit for AI request");
      return cachedResponse;
    }
    metrics.cacheMisses.inc({ type: "ai_response" });

    // List of AI services to try in order
    const aiServices = [
      { name: "qwen", fn: qwenService },
      { name: "deepseek", fn: deepseekService },
      { name: "gemma", fn: gemmaService },
      { name: "mistral", fn: mistralService },
      { name: "llama", fn: llamaService },
    ];

    let lastError = null;

    // Try each AI service in order until one succeeds
    for (const service of aiServices) {
      const serviceStartTime = Date.now();

      try {
        console.log(`Attempting to process with ${service.name} service`);
        metrics.aiServiceRequests.inc({
          service: service.name,
          status: "attempt",
        });

        const response = await service.fn(requestData);

        // Track successful request
        const serviceDuration = (Date.now() - serviceStartTime) / 1000;
        metrics.aiServiceRequests.inc({
          service: service.name,
          status: "success",
        });
        metrics.aiServiceDuration.observe(
          { service: service.name },
          serviceDuration
        );

        console.log(`Successfully processed with ${service.name} service`);

        // Parse the response to extract visualization data
        const enhancedResponse = await enhanceResponse(response, requestData);

        // Cache the successful response
        await cacheService.cacheAIResponse(requestData, enhancedResponse);

        // Save the conversation to the database if needed
        if (requestData.conversationId && requestData.userId) {
          try {
            const Conversation = require("../../models/conversation");
            await Conversation.saveConversation(
              requestData.conversationId,
              requestData.userId,
              {
                role: "user",
                content: requestData.text,
                files: requestData.files.map((f) => ({
                  name: f.name,
                  type: f.type,
                })),
                timestamp: new Date(),
              },
              {
                role: "system",
                content: enhancedResponse.text,
                visualizations: enhancedResponse.visualizationData,
                timestamp: new Date(),
              }
            );
          } catch (dbError) {
            console.error("Error saving conversation to database:", dbError);
            metrics.errorsTotal.inc({
              type: "database",
              code: dbError.code || "unknown",
            });
          }
        }

        return enhancedResponse;
      } catch (error) {
        // Track failed request
        const serviceDuration = (Date.now() - serviceStartTime) / 1000;
        metrics.aiServiceRequests.inc({
          service: service.name,
          status: "error",
        });
        metrics.aiServiceDuration.observe(
          { service: service.name },
          serviceDuration
        );
        metrics.errorsTotal.inc({
          type: "ai_service",
          code: error.code || "unknown",
        });

        console.error(`Error with ${service.name} service:`, error);
        lastError = error;
      }
    }

    // If we get here, all services failed
    console.error("All AI services failed");
    metrics.errorsTotal.inc({
      type: "ai_service",
      code: "all_services_failed",
    });

    return {
      text: "Я проанализировал ваши данные, но в процессе обработки на сервере возникла ошибка. Пожалуйста, попробуйте еще раз позже.",
      source: "fallback",
      visualizationData: [],
      context: { topic: "Error", intent: "Error Recovery" },
    };
  } finally {
    // Track total processing time
    const totalDuration = (Date.now() - startTime) / 1000;
    metrics.aiServiceDuration.observe({ service: "total" }, totalDuration);
  }
}

/**
 * Parse the AI response to extract structured data for visualizations
 * Now includes metrics tracking
 * @param {Object} response - AI response
 * @param {Object} requestData - Original request data
 * @returns {Promise<Object>} Enhanced response with visualization data
 */
async function enhanceResponse(response, requestData) {
  try {
    // First, try to extract visualization data directly from the text response
    const extractedVisualizations = extractVisualizationDataFromText(
      response.text
    );

    if (extractedVisualizations && extractedVisualizations.length > 0) {
      console.log(
        "Successfully extracted visualization data directly from text:",
        extractedVisualizations.length
      );

      // Generate actual visualization components based on the extracted data
      const visualizationData =
        await visualizationService.generateVisualizationData(
          extractedVisualizations,
          requestData.files
        );

      // Track visualization metrics
      extractedVisualizations.forEach((viz) => {
        metrics.visualizationsGenerated.inc({
          type: viz.type || "unknown",
          status: "success",
        });
      });

      // Process the text to replace visualization blocks with placeholders
      let processedText = response.text;
      const placeholders = [];

      // Sort visualizations by position in descending order to avoid index issues when replacing
      const positionedVisualizations = [...visualizationData].filter(
        (v) => v.position !== undefined
      );
      positionedVisualizations.sort((a, b) => b.position - a.position);

      // Replace visualization blocks with placeholders
      positionedVisualizations.forEach((viz, index) => {
        if (viz.position !== undefined && viz.length !== undefined) {
          const placeholder = `---VISUALIZATION_PLACEHOLDER_${index}---`;
          processedText =
            processedText.substring(0, viz.position) +
            placeholder +
            processedText.substring(viz.position + viz.length);
          placeholders.push({
            placeholder,
            visualization: viz,
          });
        }
      });

      // Add remaining visualizations without position information at the end
      const unpositionedVisualizations = visualizationData.filter(
        (v) => v.position === undefined
      );

      return {
        ...response,
        text: processedText,
        visualizationData,
        visualizationPlaceholders: placeholders,
        context: {
          topic: "Data Analysis",
          intent: "Visualization",
        },
      };
    }

    // If direct extraction failed, use the AI to structure the data
    console.log("Direct extraction failed, using AI to structure the data");

    // Create a structured prompt to extract visualization data and context
    const structuringPrompt = `
      Analyze the following AI response and extract:
      1. The main topic and user intent (context)
      2. Data that can be visualized in charts
      
      Original response:
      ${response.text}
      
      Return a JSON object with the following structure:
      {
        "context": {
          "topic": "Main topic of the conversation",
          "intent": "What the user is trying to accomplish"
        },
        "visualizationData": [
          {
            "type": "bar|line|pie|scatter",
            "title": "Chart title",
            "description": "Brief description of what this chart shows",
            "data": [
              // Array of data points appropriate for the chart type
              // For bar/line: {name: "Category", value: number}
              // For pie: {name: "Segment", value: number}
              // For scatter: {x: number, y: number, name: "Label"}
            ],
            "xAxis": "Label for X axis",
            "yAxis": "Label for Y axis"
          }
        ]
      }
    `;

    // Use the same AI service to structure the data
    const structuredResponse = await mistralService({
      ...requestData,
      text: structuringPrompt,
    });

    // Parse the JSON response
    let structuredData;
    try {
      // Find JSON in the response
      const jsonMatch = structuredResponse.text.match(
        /```json\s*([\s\S]*?)\s*```|(\{[\s\S]*\})/
      );
      const jsonString = jsonMatch
        ? jsonMatch[1] || jsonMatch[2]
        : structuredResponse.text;
      structuredData = JSON.parse(jsonString.trim());
    } catch (parseError) {
      console.error("Error parsing structured data:", parseError);
      structuredData = { context: {}, visualizationData: [] };
    }

    // Generate actual visualization components based on the structured data
    const visualizationData =
      await visualizationService.generateVisualizationData(
        structuredData.visualizationData || [],
        requestData.files
      );

    return {
      ...response,
      visualizationData,
      context: structuredData.context || {
        topic: "Data Analysis",
        intent: "Information",
      },
    };
  } catch (error) {
    console.error("Error enhancing response:", error);
    metrics.errorsTotal.inc({
      type: "response_enhancement",
      code: "enhancement_failed",
    });
    return response;
  }
}

/**
 * Process request with Qwen via OpenRouter
 * @param {Object} requestData - Request data
 * @returns {Promise<Object>} Qwen response
 */
async function qwenService(requestData) {
  try {
    const prompt = buildPrompt(requestData);

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "qwen/qwen3-30b-a3b:free",
        messages: [
          SYSTEM_MESSAGE,
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.BASE_URL || "http://localhost:3000",
          "X-Title": "Finsight Analytics",
          "Content-Type": "application/json",
        },
      }
    );

    return {
      text: response.data.choices[0].message.content,
      source: "qwen",
    };
  } catch (error) {
    console.error("Error calling Qwen service:", error);
    throw error;
  }
}

/**
 * Process request with DeepSeek via OpenRouter
 * @param {Object} requestData - Request data
 * @returns {Promise<Object>} DeepSeek response
 */
async function deepseekService(requestData) {
  try {
    const prompt = buildPrompt(requestData);

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "deepseek/deepseek-prover-v2:free",
        messages: [
          SYSTEM_MESSAGE,
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.BASE_URL || "http://localhost:3000",
          "X-Title": "Finsight Analytics",
          "Content-Type": "application/json",
        },
      }
    );

    return {
      text: response.data.choices[0].message.content,
      source: "deepseek",
    };
  } catch (error) {
    console.error("Error calling DeepSeek service:", error);
    throw error;
  }
}

/**
 * Process request with Mistral via OpenRouter
 * @param {Object} requestData - Request data
 * @returns {Promise<Object>} Mistral response
 */
async function mistralService(requestData) {
  try {
    const prompt = buildPrompt(requestData);

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "mistralai/mistral-7b-instruct:free",
        messages: [
          SYSTEM_MESSAGE,
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.BASE_URL || "http://localhost:3000",
          "X-Title": "Finsight Analytics",
          "Content-Type": "application/json",
        },
      }
    );

    return {
      text: response.data.choices[0].message.content,
      source: "mistral",
    };
  } catch (error) {
    console.error("Error calling Mistral service:", error);
    throw error;
  }
}

/**
 * Process request with Gemma via OpenRouter
 * @param {Object} requestData - Request data
 * @returns {Promise<Object>} Gemma response
 */
async function gemmaService(requestData) {
  try {
    const prompt = buildPrompt(requestData);

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "google/gemma-3-27b-it:free",
        messages: [
          SYSTEM_MESSAGE,
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.BASE_URL || "http://localhost:3000",
          "X-Title": "Finsight Analytics",
          "Content-Type": "application/json",
        },
      }
    );

    return {
      text: response.data.choices[0].message.content,
      source: "gemma",
    };
  } catch (error) {
    console.error("Error calling Gemma service:", error);
    throw error;
  }
}

/**
 * Process request with Llama via OpenRouter
 * @param {Object} requestData - Request data
 * @returns {Promise<Object>} Llama response
 */
async function llamaService(requestData) {
  try {
    const prompt = buildPrompt(requestData);

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "meta-llama/llama-3.3-8b-instruct:free",
        messages: [
          SYSTEM_MESSAGE,
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "HTTP-Referer": process.env.BASE_URL || "http://localhost:3000",
          "X-Title": "Finsight Analytics",
          "Content-Type": "application/json",
        },
      }
    );

    return {
      text: response.data.choices[0].message.content,
      source: "llama",
    };
  } catch (error) {
    console.error("Error calling Llama service:", error);
    throw error;
  }
}

/**
 * Build a standardized prompt for all AI services
 * @param {Object} requestData - Request data
 * @returns {string} Formatted prompt
 */
function buildPrompt(requestData) {
  let prompt = ANALYSIS_PROMPT_TEMPLATE.replace(
    "{userQuery}",
    requestData.text || "Не указан"
  );

  // Add conversation history for context
  let conversationHistory = "";
  if (requestData.history && requestData.history.length > 0) {
    conversationHistory = "История разговора:\n";
    requestData.history.slice(-5).forEach((msg) => {
      conversationHistory += `${
        msg.role === "user" ? "Пользователь" : "Система"
      }: ${msg.content}\n`;
    });
    conversationHistory += "\n";
  }
  prompt = prompt.replace("{conversationHistory}", conversationHistory);

  // Add information about files if present
  let fileInfo = "";
  if (requestData.files && requestData.files.length > 0) {
    fileInfo = "Информация о файлах:\n";
    requestData.files.forEach((file, index) => {
      fileInfo += `${index + 1}. Файл: ${file.name}, Тип: ${file.type}\n`;

      // Add file content or summary based on file type
      if (file.data) {
        if (file.type.includes("text")) {
          // Add text content (limited to first 1000 chars)
          fileInfo += `Содержание: ${file.data.content.substring(0, 1000)}${
            file.data.content.length > 1000 ? "..." : ""
          }\n`;
        } else if (
          file.type.includes("excel") ||
          file.type.includes("spreadsheet")
        ) {
          // Add summary of Excel data
          fileInfo += `Excel данные: ${file.data.summary.sheetCount} листов.\n`;
          // Include sample data from first sheet if available
          const firstSheetName = file.data.summary.sheetNames[0];
          if (file.data[firstSheetName] && file.data[firstSheetName].data) {
            fileInfo += "Пример данных из первого листа:\n";
            const sampleData = file.data[firstSheetName].data.slice(0, 5);
            fileInfo += JSON.stringify(sampleData, null, 2) + "\n";
          }
        } else if (file.type.includes("json")) {
          // Add JSON structure information
          fileInfo += `JSON структура: ${JSON.stringify(
            file.data.analysis,
            null,
            2
          )}\n`;
          // Include sample of actual JSON data if not too large
          if (file.data.data && JSON.stringify(file.data.data).length < 1000) {
            fileInfo += `JSON данные: ${JSON.stringify(
              file.data.data,
              null,
              2
            )}\n`;
          }
        }
      }
      fileInfo += "\n";
    });
  }
  prompt = prompt.replace("{fileInfo}", fileInfo);

  return prompt;
}

/**
 * Route to appropriate AI service based on user preferences
 * @param {Object} requestData - Request data
 * @param {Object} preferences - User preferences for AI models
 * @returns {Promise<Object>} AI response
 */
async function routeToAIService(requestData, preferences = {}) {
  try {
    // If useAll is true, use the consolidated service with fallbacks
    if (preferences.useAll) {
      return await processWithAI(requestData);
    }

    // Otherwise, try specific models based on preferences
    if (preferences.chatGPT4) {
      try {
        return await mistralService(requestData);
      } catch (error) {
        console.error("Error with mistral service:", error);
      }
    }

    if (preferences.deepseek) {
      try {
        return await deepseekService(requestData);
      } catch (error) {
        console.error("Error with DeepSeek service:", error);
      }
    }

    if (preferences.gemma) {
      try {
        return await gemmaService(requestData);
      } catch (error) {
        console.error("Error with gemma service:", error);
      }
    }

    if (preferences.llama) {
      try {
        return await llamaService(requestData);
      } catch (error) {
        console.error("Error with Llama service:", error);
      }
    }

    // If no preferred service worked, fall back to the consolidated service
    return await processWithAI(requestData);
  } catch (error) {
    console.error("Error routing to AI service:", error);
    return {
      text: "Я проанализировал ваши данные, но в процессе обработки на сервере возникла ошибка. Пожалуйста, попробуйте еще раз или обратитесь в техническую поддержку.",
      source: "fallback",
    };
  }
}

module.exports = {
  processWithAI,
  routeToAIService,
  qwenService,
  deepseekService,
  mistralService,
  gemmaService,
  llamaService,
};
