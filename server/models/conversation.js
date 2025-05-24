const mongoose = require("mongoose");

// Define a schema for file objects
const fileSchema = new mongoose.Schema(
  {
    name: String,
    type: String,
    size: Number,
  },
  { _id: false }
);

// Define a schema for visualization objects
const visualizationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["image", "chart", "data", "bar", "line", "pie", "scatter", "jsx", "error"],
    },
    title: String,
    description: String,
    data: mongoose.Schema.Types.Mixed,
    xAxis: String,
    yAxis: String,
  },
  { _id: false }
);

// Define a schema for parsed file objects
const parsedFileSchema = new mongoose.Schema(
  {
    name: String,
    type: String,
    data: mongoose.Schema.Types.Mixed,
    error: String,
  },
  { _id: false }
);

// Define a schema for context objects
const contextSchema = new mongoose.Schema(
  {
    topic: String,
    intent: String,
  },
  { _id: false }
);

// Define a schema for message objects
const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "system"],
      required: true,
    },
    content: String,
    files: [fileSchema],
    visualizations: [visualizationSchema],
    parsedFiles: [parsedFileSchema],
    context: contextSchema,
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Define the main conversation schema
const conversationSchema = new mongoose.Schema({
  conversationId: {
    type: String,
    required: true,
    unique: true,
  },
  userId: {
    type: String,
    index: true,
  },
  messages: [messageSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Initialize MongoDB connection
let isConnected = false;

/**
 * Connect to MongoDB database
 */
async function connectToDatabase() {
  if (isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    isConnected = !!db.connections[0].readyState;
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

// Create the Conversation model
const Conversation = mongoose.model("Conversation", conversationSchema);

/**
 * Save a conversation message to the database
 */
Conversation.saveConversation = async function (
  conversationId,
  userId,
  userMessage,
  systemMessage
) {
  await connectToDatabase();

  try {
    // Update or create conversation
    await this.updateOne(
      { conversationId },
      {
        $push: { messages: [userMessage, systemMessage] },
        $setOnInsert: { createdAt: new Date(), userId },
        $set: { updatedAt: new Date() },
      },
      { upsert: true }
    );

    return { success: true };
  } catch (error) {
    console.error("Error saving conversation:", error);
    throw error;
  }
};

/**
 * Get a conversation by ID
 */
Conversation.getConversation = async function (conversationId) {
  await connectToDatabase();

  try {
    const conversation = await this.findOne({ conversationId });
    return conversation;
  } catch (error) {
    console.error("Error getting conversation:", error);
    throw error;
  }
};

/**
 * Get all conversations for a user
 */
Conversation.getUserConversations = async function (userId) {
  await connectToDatabase();

  try {
    const conversations = await this.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();
    return conversations;
  } catch (error) {
    console.error("Error getting user conversations:", error);
    throw error;
  }
};

/**
 * Delete a conversation
 */
Conversation.deleteConversation = async function (conversationId) {
  await connectToDatabase();

  try {
    await this.deleteOne({ conversationId });
    return { success: true };
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
};

module.exports = Conversation;
