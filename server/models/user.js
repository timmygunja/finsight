const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
    trim: true,
  },
  username: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  preferences: {
    useAll: {
      type: Boolean,
      default: true,
    },
    chatGPT4: {
      type: Boolean,
      default: true,
    },
    deepseek: {
      type: Boolean,
      default: false,
    },
    mistral: {
      type: Boolean,
      default: false,
    },
    llama: {
      type: Boolean,
      default: false,
    },
  },
  createdAt: {
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

// Create the User model
const User = mongoose.model("User", userSchema);

/**
 * Get a user by ID
 */
User.getUserById = async function (userId) {
  await connectToDatabase();

  try {
    const user = await this.findById(userId);
    return user;
  } catch (error) {
    console.error("Error getting user by ID:", error);
    throw error;
  }
};

/**
 * Get a user by email
 */
User.getUserByEmail = async function (email) {
  await connectToDatabase();

  try {
    const user = await this.findOne({ email });
    return user;
  } catch (error) {
    console.error("Error getting user by email:", error);
    throw error;
  }
};

/**
 * Create a new user
 */
User.createUser = async function (userData) {
  await connectToDatabase();

  try {
    // Убедимся, что _id установлен
    if (!userData._id) {
      userData._id = userData.userId || `user_${Date.now()}`;
    }

    const user = new this(userData);
    await user.save();
    return user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

/**
 * Update user preferences
 */
User.updatePreferences = async function (userId, preferences) {
  await connectToDatabase();

  try {
    const user = await this.findByIdAndUpdate(
      userId,
      { $set: { preferences } },
      { new: true }
    );
    return user;
  } catch (error) {
    console.error("Error updating user preferences:", error);
    throw error;
  }
};

module.exports = User;
