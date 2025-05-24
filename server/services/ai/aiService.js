/**
 * AI Service
 * Handles interactions with various AI models
 */

const axios = require("axios");
const {
  SYSTEM_MESSAGE,
  ANALYSIS_PROMPT_TEMPLATE,
} = require("../../utils/promptTemplates");
const visualizationService = require("../visualizationService");
const {
  extractVisualizationDataFromText,
} = require("../../utils/dataExtractors");

/**
 * Main AI service that handles all AI model interactions
 * This consolidates all AI calls and implements fallback mechanisms
 * @param {Object} requestData - Request data including text, files, history, conversationId, userId
 * @returns {Promise<Object>} AI response with text, source, visualizationData, and context
 */
async function processWithAI(requestData) {
  // List of AI services to try in order
  const aiServices = [
    { name: "qwen", fn: qwenService },
    { name: "deepseek", fn: deepseekService },
    { name: "openai", fn: openaiService },
    { name: "claude", fn: claudeService },
    { name: "gemini", fn: geminiService },
  ];

  let lastError = null;

  // Try each AI service in order until one succeeds
  for (const service of aiServices) {
    try {
      console.log(`Attempting to process with ${service.name} service`);
      const response = await service.fn(requestData);

      // If we get here, the service succeeded
      console.log(`Successfully processed with ${service.name} service`);

      // Parse the response to extract visualization data
      const enhancedResponse = await enhanceResponse(response, requestData);

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
          // Continue even if database save fails
        }
      }

      return enhancedResponse;
    } catch (error) {
      console.error(`Error with ${service.name} service:`, error);
      lastError = error;
      // Continue to the next service
    }
  }

  // If we get here, all services failed
  console.error("All AI services failed");
  return {
    text: "Я проанализировал ваши данные, но в процессе обработки на сервере возникла ошибка. Пожалуйста, попробуйте еще раз или обратитесь в техническую поддержку.",
    source: "fallback",
    visualizationData: [],
    context: { topic: "Error", intent: "Error Recovery" },
  };
}

/**
 * Parse the AI response to extract structured data for visualizations
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
    const structuredResponse = await openaiService({
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
        model: "deepseek/deepseek-coder:33b",
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
 * Process request with OpenAI
 * @param {Object} requestData - Request data
 * @returns {Promise<Object>} OpenAI response
 */
async function openaiService(requestData) {
  try {
    const prompt = buildPrompt(requestData);

    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o",
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
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      text: response.data.choices[0].message.content,
      source: "openai",
    };
  } catch (error) {
    console.error("Error calling OpenAI service:", error);
    throw error;
  }
}

/**
 * Process request with Claude
 * @param {Object} requestData - Request data
 * @returns {Promise<Object>} Claude response
 */
async function claudeService(requestData) {
  try {
    const prompt = buildPrompt(requestData);

    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-3-opus-20240229",
        messages: [
          SYSTEM_MESSAGE,
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 4000,
      },
      {
        headers: {
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    return {
      text: response.data.content[0].text,
      source: "claude",
    };
  } catch (error) {
    console.error("Error calling Claude service:", error);
    throw error;
  }
}

/**
 * Process request with Gemini
 * @param {Object} requestData - Request data
 * @returns {Promise<Object>} Gemini response
 */
async function geminiService(requestData) {
  try {
    const prompt = buildPrompt(requestData);

    // Gemini has a different format for messages, so we combine system and user messages
    const combinedPrompt = `${SYSTEM_MESSAGE.content}
    
    ${prompt}`;

    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent",
      {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: combinedPrompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": process.env.GOOGLE_API_KEY,
        },
      }
    );

    return {
      text: response.data.candidates[0].content.parts[0].text,
      source: "gemini",
    };
  } catch (error) {
    console.error("Error calling Gemini service:", error);
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
        return await openaiService(requestData);
      } catch (error) {
        console.error("Error with OpenAI service:", error);
      }
    }

    if (preferences.deepseek) {
      try {
        return await deepseekService(requestData);
      } catch (error) {
        console.error("Error with DeepSeek service:", error);
      }
    }

    if (preferences.claude) {
      try {
        return await claudeService(requestData);
      } catch (error) {
        console.error("Error with Claude service:", error);
      }
    }

    if (preferences.llama) {
      try {
        // Placeholder for Llama service
        throw new Error("Llama service not implemented");
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
  openaiService,
  claudeService,
  geminiService,
};
