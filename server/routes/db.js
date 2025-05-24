const mongoose = require("mongoose");

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
    const db = await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/finsight",
      {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }
    );

    isConnected = !!db.connections[0].readyState;
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}

// Define schemas
const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "system"],
      required: true,
    },
    content: String,
    files: [
      {
        name: String,
        type: String,
        size: Number,
      },
    ],
    visualizationData: [mongoose.Schema.Types.Mixed],
    context: {
      topic: String,
      intent: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

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

// Create models (only if they don't exist)
const Conversation =
  mongoose.models.Conversation ||
  mongoose.model("Conversation", conversationSchema);

/**
 * Save a conversation message to the database
 */
async function saveConversation(
  conversationId,
  userId,
  userMessage,
  systemMessage
) {
  await connectToDatabase();

  try {
    // Update or create conversation
    await Conversation.updateOne(
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
}

/**
 * Get a conversation by ID
 */
async function getConversation(conversationId) {
  await connectToDatabase();

  try {
    const conversation = await Conversation.findOne({ conversationId });
    return conversation;
  } catch (error) {
    console.error("Error getting conversation:", error);
    throw error;
  }
}

/**
 * Get all conversations for a user
 */
async function getUserConversations(userId) {
  await connectToDatabase();

  try {
    const conversations = await Conversation.find({ userId })
      .sort({ updatedAt: -1 })
      .lean();

    return conversations;
  } catch (error) {
    console.error("Error getting user conversations:", error);
    throw error;
  }
}

/**
 * Delete a conversation
 */
async function deleteConversation(conversationId) {
  await connectToDatabase();

  try {
    await Conversation.deleteOne({ conversationId });
    return { success: true };
  } catch (error) {
    console.error("Error deleting conversation:", error);
    throw error;
  }
}

module.exports = {
  connectToDatabase,
  saveConversation,
  getConversation,
  getUserConversations,
  deleteConversation,
};
