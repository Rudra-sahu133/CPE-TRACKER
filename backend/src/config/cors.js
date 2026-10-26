import cors from "cors";

function getAllowedOrigins() {
  const configuredOrigins = process.env.FRONTEND_ORIGINS;

  if (configuredOrigins) {
    return configuredOrigins
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  // Keep local development usable without granting arbitrary production origins.
  return process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000"];
}

export function createCorsMiddleware() {
  const allowedOrigins = new Set(getAllowedOrigins());

  return cors({
    credentials: true,
    origin(origin, callback) {
      // Requests without an Origin header (for example, curl or service calls)
      // are not subject to browser CORS checks.
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      const error = new Error("Origin is not allowed by the CORS policy.");
      error.status = 403;
      callback(error);
    },
  });
}
