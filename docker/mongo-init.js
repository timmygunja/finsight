// This script will be executed when the MongoDB container starts for the first time
var db = db.getSiblingDB("finsight");

// Create collections
db.createCollection("conversations");
db.createCollection("users");

// Create indexes
db.conversations.createIndex({ conversationId: 1 }, { unique: true });
db.conversations.createIndex({ userId: 1 });
db.users.createIndex({ email: 1 }, { unique: true });

// Create an admin user for the database
db.createUser({
  user: "finsight_user",
  pwd: "finsight_password",
  roles: [
    {
      role: "readWrite",
      db: "finsight",
    },
  ],
});

// Insert some initial data if needed
db.users.insertOne({
  _id: "user_admin",
  username: "admin",
  email: "admin@example.com",
  password: "$2b$10$rRuVddzTVJkBp4X5rMVL8.4/QwHA.9wSUEf33VRbOeP0jWAVQlGFy", // hashed 'password'
  preferences: {
    useAll: true,
    chatGPT4: true,
    deepseek: false,
    claude: false,
    llama: false,
  },
  createdAt: new Date(),
});
