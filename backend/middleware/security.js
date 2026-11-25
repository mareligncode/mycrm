/**
 * Lightweight security headers and in-memory sliding-window rate limiter.
 */

export const securityHeaders = (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
};

export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 300,
  message = "Too many requests, please try again later.",
} = {}) => {
  const hits = new Map();

  // Periodically prune expired keys to keep memory bounded
  const cleanupTimer = setInterval(() => {
    const cutoff = Date.now() - windowMs;
    for (const [key, timestamps] of hits.entries()) {
      const recent = timestamps.filter((ts) => ts > cutoff);
      if (recent.length === 0) {
        hits.delete(key);
      } else {
        hits.set(key, recent);
      }
    }
  }, Math.min(windowMs, 60 * 1000));
  if (cleanupTimer.unref) cleanupTimer.unref();

  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const key = `${ip}:${req.baseUrl || ""}`;
    const now = Date.now();
    const cutoff = now - windowMs;

    const existing = hits.get(key) || [];
    const recent = existing.filter((ts) => ts > cutoff);

    if (recent.length >= max) {
      res.setHeader("Retry-After", Math.ceil(windowMs / 1000));
      return res.status(429).json({ success: false, message });
    }

    recent.push(now);
    hits.set(key, recent);
    next();
  };
};
