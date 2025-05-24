const express = require("express");
const router = express.Router();
const Conversation = require("../models/conversation");
const User = require("../models/user");

// Get all conversations for a user
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const conversations = await Conversation.getUserConversations(userId);
    res.json(conversations);
  } catch (error) {
    console.error("Error getting conversations:", error);
    res.status(500).json({ error: "Failed to get conversations" });
  }
});

// Get a specific conversation
router.get("/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.getConversation(conversationId);

    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    res.json(conversation);
  } catch (error) {
    console.error("Error getting conversation:", error);
    res.status(500).json({ error: "Failed to get conversation" });
  }
});

// Register a user or initialize a session
router.post("/", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check if user exists
    let user = await User.getUserById(userId).catch(() => null);

    // If user doesn't exist, create a new one
    if (!user) {
      user = await User.createUser({
        _id: userId,
        username: `user_${Date.now()}`,
        email: `${userId}@example.com`,
        password: "temporary_password", // In a real app, you'd use a secure password
        preferences: {
          useAll: true,
          chatGPT4: true,
          deepseek: false,
          mistral: false,
          llama: false,
        },
      });
    }

    res.json({ success: true, userId: user._id });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ error: "Failed to register user" });
  }
});

// Delete a conversation
router.delete("/:conversationId", async (req, res) => {
  try {
    const { conversationId } = req.params;

    await Conversation.deleteConversation(conversationId);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting conversation:", error);
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

module.exports = router;
