export function errorHandler(error, _request, response, _next) {
  const statusCode = Number.isInteger(error.status) && error.status >= 400 && error.status <= 599
    ? error.status
    : error.type === "entity.parse.failed"
      ? 400
      : error.type === "entity.too.large"
        ? 413
        : 500;
  const message = error.type === "entity.parse.failed"
    ? "Request body must contain valid JSON."
    : error.type === "entity.too.large"
      ? "Request body is too large."
      : statusCode >= 500 && process.env.NODE_ENV === "production"
        ? "An unexpected error occurred."
        : error.message || "An unexpected error occurred.";

  if (statusCode >= 500) {
    console.error(error);
  }

  const payload = {
    status: "error",
    message,
  };
  if (error.details && typeof error.details === "object") payload.errors = error.details;

  response.status(statusCode).json(payload);
}
