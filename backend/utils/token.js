import jwt from "jsonwebtoken";
import crypto from "crypto";

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET || "default_secret_key", {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
};

export const generateRandomToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

export const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};
