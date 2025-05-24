const express = require("express");
const multer = require("multer");
const cors = require("cors");
const mongoose = require("mongoose");
const { processExcelFile } = require("./utils/excelProcessor");
const { processJsonFile } = require("./utils/jsonProcessor");
const { processImageFile } = require("./utils/imageProcessor");
const { processTextFile } = require("./utils/textProcessor");
const { sendToMLService } = require("./services/mlService");
const {
  sendToVisualizationService,
} = require("./services/visualizationService");
const Conversation = require("./models/conversation");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Middleware
app.use(cors());
app.use(express.json());

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

// API endpoint for data analysis
app.post("/api/analyze", upload.array("files"), async (req, res) => {
  try {
    const { text } = req.body;
    const files = req.files || [];
    const history = req.body.history ? JSON.parse(req.body.history) : [];
    const conversationId = req.body.conversationId || `conv_${Date.now()}`;

    console.log(
      `Processing request with ${files.length} files and text: ${text}`
    );

    // Process each file based on its type
    const processedFiles = await Promise.all(
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

    // Create a unified request object
    const requestData = {
      text,
      files: processedFiles,
      history,
      conversationId,
    };

    // Store user message in MongoDB
    await Conversation.updateOne(
      { conversationId },
      {
        $push: {
          messages: {
            role: "user",
            content: text,
            files: files.map((f) => ({
              name: f.originalname,
              type: f.mimetype,
              size: f.size,
            })),
            timestamp: new Date(),
          },
        },
        $setOnInsert: { createdAt: new Date() },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    // Send to ML service for analysis
    const mlResponse = await sendToMLService(requestData);

    // Send to visualization service
    const visualizations = await sendToVisualizationService(
      requestData,
      mlResponse
    );

    // Combine results
    const response = {
      response: mlResponse.text,
      visualizations,
      conversationId,
    };

    // Store system response in MongoDB
    await Conversation.updateOne(
      { conversationId },
      {
        $push: {
          messages: {
            role: "system",
            content: response.response,
            visualizations,
            timestamp: new Date(),
          },
        },
        $set: { updatedAt: new Date() },
      }
    );

    res.json(response);
  } catch (error) {
    console.error("Error processing request:", error);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// Get conversation history
app.get("/api/conversations/:conversationId", async (req, res) => {
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
