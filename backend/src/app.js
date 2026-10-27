import express from "express";
import { createCorsMiddleware } from "./config/cors.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFoundHandler } from "./middleware/not-found.middleware.js";
import healthRouter from "./routes/health.routes.js";
import professionalsRouter from "./routes/professionals.routes.js";
import coursesRouter from "./routes/courses.routes.js";
import authRouter from "./routes/auth.routes.js";
import adminRouter from "./routes/admin.routes.js";

const app = express();

app.disable("x-powered-by");
app.use(createCorsMiddleware());
app.use(express.json({ limit: "1mb" }));
app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/professionals", professionalsRouter);
app.use("/api/courses", coursesRouter);
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
