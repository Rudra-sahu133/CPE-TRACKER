import "dotenv/config";
import app from "./app.js";
import {
  closeDatabaseConnection,
  connectToDatabase,
} from "./config/database.js";

const configuredPort = Number.parseInt(process.env.PORT ?? "5000", 10);
const port = Number.isInteger(configuredPort) && configuredPort > 0
  ? configuredPort
  : 5000;

let httpServer;
let isShuttingDown = false;

function listen(portNumber) {
  return new Promise((resolve, reject) => {
    const server = app.listen(portNumber);
    const handleError = (error) => reject(error);

    server.once("error", handleError);
    server.once("listening", () => {
      server.off("error", handleError);
      resolve(server);
    });
  });
}

async function startServer() {
  try {
    await connectToDatabase();
  } catch (error) {
    const message = error.code === "MONGODB_URI_REQUIRED"
      ? "MONGODB_URI is not set. Add it to backend/.env before starting the API."
      : "MongoDB connection failed. Check MONGODB_URI, database credentials, and network access.";

    console.error(`API startup aborted. ${message}`);
    await closeDatabaseConnection().catch(() => {});
    process.exitCode = 1;
    return;
  }

  try {
    httpServer = await listen(port);
  } catch {
    console.error("API startup aborted. The HTTP server could not listen on the configured PORT.");
    await closeDatabaseConnection().catch(() => {});
    process.exitCode = 1;
    return;
  }

  console.log(`CPE Tracker API listening on http://localhost:${port}`);
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
}

async function shutdown(signal) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`${signal} received. Closing the API and MongoDB connection...`);

  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out.");
    process.exit(1);
  }, 10_000);
  forceExitTimer.unref();

  try {
    await new Promise((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
    await closeDatabaseConnection();
    clearTimeout(forceExitTimer);
    console.log("API and MongoDB connection closed.");
    process.exit(0);
  } catch {
    clearTimeout(forceExitTimer);
    console.error("The API did not shut down cleanly.");
    process.exit(1);
  }
}

await startServer();
