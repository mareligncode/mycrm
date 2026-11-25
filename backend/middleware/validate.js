import mongoose from "mongoose";

/**
 * Escapes RegExp metacharacters in user-supplied search terms to prevent ReDoS.
 */
export const escapeRegex = (value = "") => {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

export const isValidObjectId = (id) => {
  return typeof id === "string" && mongoose.Types.ObjectId.isValid(id);
};

export const validateObjectIdParam = (paramName = "id") => {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!isValidObjectId(value)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} parameter`,
      });
    }
    next();
  };
};

export const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
};

export const parsePagination = (query, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
};
