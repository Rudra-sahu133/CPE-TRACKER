import mongoose from "mongoose";

let connectionPromise;

export async function connectToDatabase(uri = process.env.MONGODB_URI) {
  if (!uri?.trim()) {
    const error = new Error("MONGODB_URI is required to start the API.");
    error.code = "MONGODB_URI_REQUIRED";
    throw error;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10_000 })
      .then(() => mongoose.connection)
      .catch((cause) => {
        connectionPromise = undefined;
        throw new Error("MongoDB connection failed.", { cause });
      });
  }

  return connectionPromise;
}

export function getDatabaseConnectionState() {
  const states = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  return states[mongoose.connection.readyState] ?? "unknown";
}

export async function closeDatabaseConnection() {
  connectionPromise = undefined;

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
