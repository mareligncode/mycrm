import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables reliably from backend directory
dotenv.config({ path: path.resolve(__dirname, ".env") });
dotenv.config();

import connectDB from "./config/db.js";
import apiRoutes from "./routes/index.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { securityHeaders, createRateLimiter } from "./middleware/security.js";
import { startScheduler } from "./utils/scheduler.js";

if (!process.env.JWT_SECRET) {
  console.warn("⚠️ JWT_SECRET is not set in environment; falling back to development secret.");
}

// Kick off initial connection in background; request middleware awaits readiness
connectDB().catch(() => {});

const app = express();

// Security & CORS Middleware
app.use(securityHeaders);

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// Rate Limiting
const apiLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 600 });
const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many authentication attempts. Please try again later.",
});

app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register-admin", authLimiter);
app.use("/api", apiLimiter);

// Health Check
app.get("/api/health", async (req, res) => {
  const states = ["disconnected", "connected", "connecting", "disconnecting"];
  if (mongoose.connection.readyState !== 1) {
    await connectDB().catch(() => {});
  }
  res.status(200).json({
    success: true,
    message: "CRM API is healthy and running",
    db: states[mongoose.connection.readyState] || "unknown",
    timestamp: new Date().toISOString(),
  });
});

// Ensure MongoDB connection is ready before handling database-backed API routes
app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    res.status(503);
    next(error);
  }
});

// API Routes
app.use("/api", apiRoutes);

// Error Handling Middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 CRM Backend Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
    if (process.env.ENABLE_SCHEDULER !== "false") {
      startScheduler(Number(process.env.SCHEDULER_INTERVAL_MS || 60000));
    }
  });
}

export default app;
