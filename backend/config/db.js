import mongoose from "mongoose";

let cachedConnectionPromise = null;

/**
 * Ensures a single reusable MongoDB connection (safe for both Node servers and serverless).
 */
const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  const mongoUri = process.env.MONGO_URI?.trim();
  if (!mongoUri) {
    throw new Error("MONGO_URI environment variable is not configured");
  }

  if (!cachedConnectionPromise) {
    cachedConnectionPromise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: Number(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || 8000),
      })
      .then((conn) => {
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
        return conn.connection;
      })
      .catch((error) => {
        cachedConnectionPromise = null;
        console.error(`❌ MongoDB Connection Error: ${error.message}`);
        throw error;
      });
  }

  return cachedConnectionPromise;
};

mongoose.connection.on("disconnected", () => {
  cachedConnectionPromise = null;
  console.log("MongoDB disconnected. Attempting reconnection...");
});

export default connectDB;
