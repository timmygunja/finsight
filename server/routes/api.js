const express = require("express");
const router = express.Router();
const multer = require("multer");
const { processExcelFile } = require("../utils/excelProcessor");
const { processJsonFile } = require("../utils/jsonProcessor");
const { processImageFile } = require("../utils/imageProcessor");
const { processTextFile } = require("../utils/textProcessor");
const Conversation = require("../models/conversation");
const User = require("../models/user");
const { sendToMLService } = require("../services/mlService");

// Update the multer configuration to ensure proper handling of file names
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Ensure correct encoding of filenames
    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    cb(null, true);
  },
});

// Before the route handler function, add this buffer encoding utility
function decodeBuffer(buffer) {
  return buffer.toString("utf8");
}

// Route for data analysis
router.post("/analyze", upload.array("files", 5), async (req, res) => {
  try {
    const { text } = req.body;
    const files = req.files || [];
    const history = req.body.history ? JSON.parse(req.body.history) : [];
    const conversationId = req.body.conversationId || `conv_${Date.now()}`;
    const userId = req.body.userId || null;

    console.log(
      `Processing request with ${files.length} files and text: ${text}`
    );

    // Get user preferences if userId is provided
    let userPreferences = { useAll: true };
    if (userId) {
      try {
        const user = await User.findById(userId);
        if (user && user.preferences) {
          userPreferences = user.preferences;
        }
      } catch (userError) {
        console.error("Error fetching user preferences:", userError);
        // Continue with default preferences
      }
    }

    // Process each file based on its type
    const parsedFiles = await Promise.all(
      files.map(async (file) => {
        const fileType = file.mimetype;
        const fileName = file.originalname;

        try {
          if (
            fileType.includes("spreadsheet") ||
            fileType.includes("excel") ||
            fileName.endsWith(".csv")
          ) {
            return {
              name: fileName,
              type: fileType,
              data: await processExcelFile(file.buffer),
            };
          } else if (fileType.includes("json") || fileName.endsWith(".json")) {
            return {
              name: fileName,
              type: fileType,
              data: await processJsonFile(file.buffer),
            };
          } else if (fileType.startsWith("image/")) {
            return {
              name: fileName,
              type: fileType,
              data: await processImageFile(file.buffer),
            };
          } else {
            return {
              name: fileName,
              type: fileType,
              data: await processTextFile(file.buffer),
            };
          }
        } catch (error) {
          console.error(`Error processing file ${fileName}:`, error);
          return {
            name: fileName,
            type: fileType,
            error: error.message,
          };
        }
      })
    );

    // Send to ML service for analysis with user preferences
    let mlResponse = { text: "", visualizations: [] };

    try {
      // Prepare data for ML service
      const mlRequestData = {
        text,
        files: parsedFiles,
        history: req.body.history ? JSON.parse(req.body.history) : [],
        conversationId,
      };

      mlResponse = await sendToMLService(mlRequestData, userPreferences);
      console.log(`ML service returned ${mlResponse.visualizations?.length || 0} visualizations`)
    } catch (mlError) {
      console.error("Error with ML service:", mlError);
      // Continue processing even if ML service fails
    }

    // Create user message document
    const userMessage = {
      role: "user",
      content: text,
      files: files.map((f) => ({
        name: f.originalname,
        type: f.mimetype,
        size: f.size,
      })),
      timestamp: new Date(),
    };

    // Save user message to database
    try {
      await Conversation.updateOne(
        { conversationId },
        {
          $push: { messages: userMessage },
          $setOnInsert: { createdAt: new Date(), userId },
          $set: { updatedAt: new Date() },
        },
        { upsert: true }
      );
    } catch (dbError) {
      console.error("Error saving to database:", dbError);
      // Continue processing even if database save fails
    }

    // Generate response in Russian
    let response = "Я получил ваше сообщение";

    if (text) {
      response += ` с текстом: "${text}"`;
    }

    if (files.length > 0) {
      response += ` и ${files.length} файл(ов): ${files
        .map((f) => f.originalname)
        .join(", ")}`;
    }

    response += "\n\nЯ проанализировал данные и готов предоставить результаты.";

    // Add information about each processed file in Russian
    if (parsedFiles.length > 0) {
      response += "\n\nРезультаты обработки файлов:";

      parsedFiles.forEach((file) => {
        response += `\n- ${file.name}: `;

        if (file.error) {
          response += `Ошибка при обработке: ${file.error}`;
        } else if (file.type.includes("image")) {
          response += "Изображение успешно обработано.";
        } else if (
          file.type.includes("spreadsheet") ||
          file.type.includes("excel") ||
          file.name.endsWith(".csv")
        ) {
          const sheetCount = file.data.summary.sheetCount;
          response += `Excel файл с ${sheetCount} листами.`;
        } else if (file.type.includes("json")) {
          response += `JSON файл со структурой типа ${file.data.analysis.type}.`;
        } else {
          response += `Текстовый файл с ${file.data.analysis.characterCount} символами.`;
        }
      });
    }

    // We'll move the analysis to after the file processing results
    // and format it with proper indentation and spacing
    let analysisText = "";
    if (mlResponse && mlResponse.text) {
      // Format the analysis text to be more readable
      analysisText = formatAnalysisText(mlResponse.text);
    }

    // Now add the formatted analysis after the file processing results
    if (analysisText) {
      response += "\n\nАнализ:\n" + analysisText;
    }

    // Create system response document with visualizations
    const systemMessage = {
      role: "system",
      content: response,
      parsedFiles,
      visualizations: mlResponse.visualizations || [],
      timestamp: new Date(),
    };

    // Save system response to database
    try {
      await Conversation.updateOne(
        { conversationId },
        {
          $push: { messages: systemMessage },
          $set: { updatedAt: new Date() },
        }
      );
    } catch (dbError) {
      console.error("Error saving system response to database:", dbError);
      // Continue processing even if database save fails
    }

    res.json({
      response,
      parsedFiles,
      visualizations: mlResponse.visualizations || [],
      conversationId,
      source: mlResponse.source || "system",
    });
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// Get conversation history
router.get("/conversations/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findOne({ conversationId });

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(conversation);
  } catch (error) {
    console.error("Error fetching conversation:", error);
    res.status(500).json({ error: "Failed to fetch conversation" });
  }
});

// Get all conversations for a user
router.get("/conversations", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const conversations = await Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    res.json(conversations);
  } catch (error) {
    console.error("Error getting conversations:", error);
    res.status(500).json({ error: "Failed to get conversations" });
  }
});

// Get user preferences
router.get("/user-preferences/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ preferences: user.preferences || { useAll: true } });
  } catch (error) {
    console.error("Error fetching user preferences:", error);
    res.status(500).json({ error: "Failed to fetch user preferences" });
  }
});

// Update user preferences
router.post("/user-preferences/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { preferences } = req.body;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ preferences: updatedUser.preferences });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    res.status(500).json({ error: "Failed to update user preferences" });
  }
});

/**
 * Format analysis text to be more readable
 * @param {String} text - Raw analysis text
 * @returns {String} Formatted text
 */
function formatAnalysisText(text) {
  // Split text into lines
  const lines = text.split("\n");

  // Process each line to add proper indentation and spacing
  const formattedLines = lines.map((line) => {
    // Add indentation for headers
    if (line.startsWith("###")) {
      return `\n${line}\n`;
    }

    if (line.startsWith("####")) {
      return `\n${line}\n`;
    }

    if (line.startsWith("#####")) {
      return `\n${line}\n`;
    }

    // Add spacing for list items
    if (line.trim().startsWith("-")) {
      return `  ${line}`;
    }

    // Add spacing for numbered items
    if (/^\d+\./.test(line.trim())) {
      return `  ${line}`;
    }

    // Handle horizontal rules
    if (line.trim() === "---") {
      return "\n---\n";
    }

    return line;
  });

  // Join lines back together
  let formatted = formattedLines.join("\n");

  // Replace multiple consecutive newlines with just two
  formatted = formatted.replace(/\n{3,}/g, "\n\n");

  return formatted;
}

module.exports = router;
