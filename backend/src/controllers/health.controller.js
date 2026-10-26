import { getDatabaseConnectionState } from "../config/database.js";

export function getHealth(_request, response) {
  const database = getDatabaseConnectionState();
  const connected = database === "connected";

  response.status(connected ? 200 : 503).json({
    status: connected ? "ok" : "unavailable",
    service: "cpe-tracker-api",
    message: "API is running",
    database,
  });
}
